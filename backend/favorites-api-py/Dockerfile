# Build context: this folder (backend/favorites-api-py). docker-compose.yml sets it.

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

FROM base AS build
# uv is pinned to the version the lock file was made with.
COPY --from=ghcr.io/astral-sh/uv:0.12.13 /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never
WORKDIR /app
# Dependencies first, so this layer is cached until pyproject.toml or uv.lock change.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project
COPY src ./src
# --no-editable puts the project in site-packages, so the final image needs only the venv.
RUN uv sync --frozen --no-dev --no-editable

FROM base AS final
# mssql-python needs no ODBC manager, but it does need these three libraries; without them it fails with
# "Failed to load the driver" (found in the spike, issue #133).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libltdl7 libkrb5-3 libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
USER 10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2)"]
# The .NET service trusts X-Forwarded-* from any proxy (KnownProxies is cleared), and so does this one.
ENTRYPOINT ["uvicorn", "favorites_api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8080", \
    "--proxy-headers", "--forwarded-allow-ips", "*"]
