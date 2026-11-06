// Read one Ask the BA thread using GitHub-supplied authorship for each piece of text.
const { mkdir, writeFile } = require('node:fs/promises');

const provenance = 'author { login __typename } authorAssociation lastEditedAt editor { login __typename }';
const commentFields = `id body isMinimized ${provenance}`;
const pageFields = 'pageInfo { hasNextPage endCursor }';
const topicQuery = `query Topic($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    discussion(number: $number) { id number title body url category { name } ${provenance} }
  }
}`;
const commentsQuery = `query Comments($id: ID!, $after: String) {
  node(id: $id) { ... on Discussion {
    comments(first: 50, after: $after) { nodes { ${commentFields} replies(first: 1) { totalCount } } ${pageFields} }
  } }
}`;
const repliesQuery = `query Replies($id: ID!, $after: String) {
  node(id: $id) { ... on DiscussionComment {
    replies(first: 50, after: $after) { nodes { ${commentFields} } ${pageFields} }
  } }
}`;

function source(item, blocked) {
  const author = item?.author;
  if (!author?.login || blocked.has(author.login.toLowerCase()) || item.isMinimized) return null;
  if (item.lastEditedAt && (item.editor?.login !== author.login || item.editor?.__typename !== author.__typename)) return null;
  if (author.__typename === 'Bot' && author.login === 'github-actions[bot]') return 'actions';
  if (author.__typename === 'User' && ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(item.authorAssociation)) return 'stakeholder';
  return null;
}

async function* pages(graphql, query, id, field) {
  let after = null;
  const seen = new Set();
  while (true) {
    const { node } = await graphql(query, { id, after });
    const { nodes, pageInfo } = node[field];
    yield* nodes;
    if (pageInfo.hasNextPage === false) return;
    if (!pageInfo.hasNextPage || !pageInfo.endCursor || seen.has(pageInfo.endCursor)) {
      throw new Error(`Cannot finish reading discussion ${field}: invalid pagination.`);
    }
    after = pageInfo.endCursor;
    seen.add(after);
  }
}

async function readThread(graphql, repo, number, blockedUsers = '') {
  const blocked = new Set(blockedUsers.split(/[,\n]/).map(login => login.trim().toLowerCase()));
  const { repository } = await graphql(topicQuery, { ...repo, number });
  const topic = repository.discussion;
  if (!topic || topic.number !== number || topic.category.name !== 'Ask the BA') {
    throw new Error('The triggering Ask the BA discussion could not be verified.');
  }
  if (source(topic, blocked) !== 'stakeholder') return { status: 'ineligible' };

  const comments = [];
  for await (const comment of pages(graphql, commentsQuery, topic.id, 'comments')) {
    const kind = source(comment, blocked);
    const replies = [];
    if (comment.replies.totalCount > 0) {
      for await (const reply of pages(graphql, repliesQuery, comment.id, 'replies')) {
        const replyKind = source(reply, blocked);
        if (replyKind) replies.push({ source: replyKind, author: reply.author.login, body: reply.body });
      }
    }
    if (kind) comments.push({ source: kind, author: comment.author.login, body: comment.body, replies });
    else if (replies.length) comments.push({ source: 'omitted', replies });
  }
  return { status: 'ready', number, url: topic.url, author: topic.author.login, title: topic.title, body: topic.body, comments };
}

async function prepare({ github, context }) {
  const thread = await readThread(github.graphql, context.repo, context.payload.discussion.number, process.env.BA_BLOCKED_USERS);
  await mkdir('/tmp/gh-aw', { recursive: true });
  await writeFile('/tmp/gh-aw/ba-discussion.json', JSON.stringify(thread), { flag: 'wx', mode: 0o444 });
}

module.exports = { prepare, readThread };
