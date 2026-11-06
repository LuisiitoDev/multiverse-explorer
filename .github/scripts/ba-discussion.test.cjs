const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThread } = require('./ba-discussion.cjs');

const repo = { owner: 'LuisiitoDev', repo: 'multiverse-explorer' };
const owner = { __typename: 'User', login: repo.owner };
const topic = { id: 'topic', number: 104, category: { name: 'Ask the BA' }, title: 'Feature', body: 'Approved request', author: owner, authorAssociation: 'OWNER' };
const item = (id, extra = {}) => ({ id, body: id, author: owner, authorAssociation: 'OWNER', replies: { totalCount: 0 }, ...extra });
const page = (nodes, cursor = null) => ({ nodes, pageInfo: { hasNextPage: cursor !== null, endCursor: cursor } });
const result = (graphql, blocked) => readThread(graphql, repo, 104, blocked);

test('reads each page; checks authors of comments and replies independently', async () => {
  const calls = [];
  const graphql = async (query, vars) => {
    assert.match(query, /authorAssociation/);
    assert.match(query, /author \{ login __typename \}/);
    if (query.includes('query Topic')) {
      assert.deepEqual(vars, { ...repo, number: 104 });
      return { repository: { discussion: topic } };
    }
    calls.push([vars.id, vars.after]);
    if (query.includes('query Replies')) {
      assert.equal(vars.id, 'external');
      const replies = vars.after ? page([item('eligible reply')]) : page([item('private reply', { author: null })], 'r2');
      return { node: { replies } };
    }
    assert.equal(vars.id, 'topic');
    const comments = vars.after ? page([
      item('last page'),
      item('blocked text', { author: { __typename: 'User', login: 'Blocked-User' } }),
      item('moderated text', { isMinimized: true }),
      item('edited by somebody else', { lastEditedAt: '2026-01-01', editor: { login: 'other', __typename: 'User' } }),
      item('edited by unknown actor', { lastEditedAt: '2026-01-01' }),
      item('BA marker', { author: { __typename: 'Bot', login: 'github-actions[bot]' }, authorAssociation: 'NONE' }),
      item('another bot', { author: { __typename: 'Bot', login: 'custom[bot]' } }),
    ]) : page([
      item('first page'),
      item('external', { authorAssociation: 'NONE', replies: { totalCount: 2 } }),
      item('unknown author', { author: null }),
    ], 'c2');
    return { node: { comments } };
  };
  const thread = await result(graphql, 'other,\nblocked-user');
  assert.equal(thread.status, 'ready');
  assert.deepEqual(calls, [['topic', null], ['external', null], ['external', 'r2'], ['topic', 'c2']]);
  assert.deepEqual(thread.comments.map(entry => [entry.source, entry.body]), [
    ['stakeholder', 'first page'], ['omitted', undefined], ['stakeholder', 'last page'], ['actions', 'BA marker'],
  ]);
  assert.deepEqual(thread.comments[1].replies, [{ source: 'stakeholder', author: repo.owner, body: 'eligible reply' }]);
});

test('unknown or blocked root authors release no content and start no comment reads', async () => {
  for (const [override, blocked] of [[{ author: null }, ''], [{ authorAssociation: 'CONTRIBUTOR' }, ''], [{}, 'luisiitodev']]) {
    let calls = 0;
    const read = async () => { calls++; return { repository: { discussion: { ...topic, ...override } } }; };
    assert.deepEqual(await result(read, blocked), { status: 'ineligible' });
    assert.equal(calls, 1);
  }
});

test('API and pagination failures never produce a partial thread', async () => {
  const first = async query => query.includes('query Topic') ? { repository: { discussion: topic } } : { node: { comments: page([item('partial')], 'repeated') } };
  await assert.rejects(result(first), /invalid pagination/);
  const second = async query => {
    if (query.includes('query Topic')) return { repository: { discussion: topic } };
    throw new Error('API unavailable');
  };
  await assert.rejects(result(second), /API unavailable/);
});
