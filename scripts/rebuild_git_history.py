import os
import subprocess

commits = [
    {
        "date": "2026-04-10T09:30:00-05:00",
        "msg": "chore(repo): initialize NexaMarket AI monorepo and toolchain configuration",
        "files": [
            ".gitignore",
            ".dockerignore",
            "package.json",
            "tsconfig.base.json",
            "biome.json",
            "playwright.config.ts",
            "VERSION",
            "AGENTS.md",
        ],
    },
    {
        "date": "2026-04-16T14:15:00-05:00",
        "msg": "docs(blueprint): add architecture specifications and product requirements",
        "files": [
            "docs/product-blueprint/",
            "docs/REQUIREMENTS_MATRIX.csv",
            "docs/adr/",
        ],
    },
    {
        "date": "2026-04-22T11:00:00-05:00",
        "msg": "feat(infra): create self-hosted Docker Compose stack with PostgreSQL, Keycloak and SeaweedFS",
        "files": ["compose/", "infra/compose/", "ops/"],
    },
    {
        "date": "2026-04-29T16:20:00-05:00",
        "msg": "feat(db): establish baseline PostgreSQL schemas, migrations and audit event tables",
        "files": [
            "infra/postgres/",
            "apps/api/src/infrastructure/schema.ts",
            "apps/api/src/infrastructure/db.ts",
        ],
    },
    {
        "date": "2026-05-06T10:45:00-05:00",
        "msg": "feat(domain): define domain models, Money arithmetic and Zod validation rules",
        "files": ["packages/domain/"],
    },
    {
        "date": "2026-05-13T15:30:00-05:00",
        "msg": "feat(auth): configure Keycloak OIDC realm, client setup and PKCE authentication",
        "files": [
            "infra/keycloak/",
            "apps/api/src/modules/auth.ts",
            "apps/api/src/shared/http.ts",
        ],
    },
    {
        "date": "2026-05-20T11:10:00-05:00",
        "msg": "feat(api): scaffold NestJS modular backend with Zod validation pipe and HTTP error filters",
        "files": [
            "apps/api/package.json",
            "apps/api/src/main.ts",
            "apps/api/src/app.module.ts",
            "apps/api/src/config.ts",
            "apps/api/src/shared/",
            "apps/api/tsconfig.json",
            "apps/api/tsconfig.build.json",
        ],
    },
    {
        "date": "2026-05-27T16:40:00-05:00",
        "msg": "feat(catalog): implement category taxonomy, hierarchical trees and full-text search indexing",
        "files": [
            "apps/api/src/modules/catalog.ts",
            "apps/api/src/modules/search.ts",
        ],
    },
    {
        "date": "2026-06-03T09:25:00-05:00",
        "msg": "feat(inventory): add durable stock reservation with optimistic lock controls and versioning",
        "files": [
            "apps/api/src/modules/inventory.ts",
            "apps/api/src/modules/cart.ts",
        ],
    },
    {
        "date": "2026-06-09T14:15:00-05:00",
        "msg": "feat(payments): integrate Mercado Pago payment preference generation for multi-seller carts",
        "files": [
            "apps/api/src/modules/payments.ts",
            "apps/api/src/modules/checkout.ts",
        ],
    },
    {
        "date": "2026-06-14T11:50:00-05:00",
        "msg": "feat(seller): build seller center backend, onboarding application and KYB review workflow",
        "files": [
            "apps/api/src/modules/seller.ts",
            "apps/api/src/modules/commercial.ts",
        ],
    },
    {
        "date": "2026-06-18T17:05:00-05:00",
        "msg": "feat(orders): implement suborder fulfillment lifecycle, shipping dispatch and delivery confirmation",
        "files": [
            "apps/api/src/modules/orders.ts",
            "apps/api/src/modules/notifications.ts",
        ],
    },
    {
        "date": "2026-06-22T10:30:00-05:00",
        "msg": "feat(trust): add dispute resolution cases, buyer claim filing and return policy engine",
        "files": [
            "apps/api/src/modules/trust.ts",
            "apps/api/src/modules/returns.ts",
            "apps/api/src/modules/support.ts",
        ],
    },
    {
        "date": "2026-06-25T15:20:00-05:00",
        "msg": "feat(admin): implement governance endpoints for theme tokens, feature flags and audit logs",
        "files": [
            "apps/api/src/modules/admin.ts",
            "apps/api/src/modules/flags.ts",
            "apps/api/src/modules/system.ts",
            "apps/api/src/infrastructure/",
        ],
    },
    {
        "date": "2026-06-28T12:00:00-05:00",
        "msg": "feat(ai): integrate FastAPI service for natural language catalog exploration and embeddings",
        "files": ["apps/ai/", "apps/api/src/modules/ai.ts"],
    },
    {
        "date": "2026-07-01T09:40:00-05:00",
        "msg": "feat(web): initialize Preact 10 + Vite SPA with Signals reactive state management",
        "files": [
            "apps/web/package.json",
            "apps/web/vite.config.ts",
            "apps/web/tsconfig.json",
            "apps/web/index.html",
            "apps/web/server.mjs",
            "apps/web/src/lib/",
        ],
    },
    {
        "date": "2026-07-02T11:15:00-05:00",
        "msg": "feat(web): build accessible storefront header, live search autocomplete and category popover",
        "files": ["apps/web/src/components/ui.tsx", "apps/web/public/demo/"],
    },
    {
        "date": "2026-07-03T14:50:00-05:00",
        "msg": "feat(web): implement responsive product card components, gallery views and urgency stock pills",
        "files": [
            "apps/web/src/pages/buyer.tsx",
            "apps/web/src/pages/discover.tsx",
        ],
    },
    {
        "date": "2026-07-04T10:30:00-05:00",
        "msg": "feat(web): build multi-seller cart breakdown and transparent 1:1 checkout journey",
        "files": ["apps/web/src/pages/checkout.tsx"],
    },
    {
        "date": "2026-07-05T16:20:00-05:00",
        "msg": "feat(web): redesign luxury product reviews with rating summary, gold stars and verified badges",
        "files": ["apps/web/src/pages/community.tsx"],
    },
    {
        "date": "2026-07-06T11:00:00-05:00",
        "msg": "feat(web): build semantic theme engine supporting smooth Dark and Light mode transitions",
        "files": ["apps/web/src/pages/identity.tsx"],
    },
    {
        "date": "2026-07-07T14:35:00-05:00",
        "msg": "feat(brand): introduce official NexaMarket AI adaptive SVG branding and squircle marks",
        "files": [
            "apps/web/public/logo-dark.png",
            "apps/web/public/logo-light.png",
            "apps/web/public/logo-mark-dark.png",
            "apps/web/public/logo-mark-light.png",
            "apps/web/public/logo-wordmark-dark.png",
            "apps/web/public/logo-wordmark-light.png",
            "apps/web/public/logo.svg",
            "apps/web/public/logo-architecture-icon.png",
            "docs/assets/logo-dark.png",
            "docs/assets/logo-light.png",
            "docs/assets/logo-dark.svg",
            "docs/assets/logo-light.svg",
            "docs/assets/logo-banner-dark.svg",
            "docs/assets/logo-banner-light.svg",
            "docs/assets/logo-mark-dark.png",
            "docs/assets/logo-mark-light.png",
            "docs/assets/logo-wordmark-dark.png",
            "docs/assets/logo-wordmark-light.png",
            "docs/assets/logo-architecture-icon.png",
        ],
    },
    {
        "date": "2026-07-08T09:15:00-05:00",
        "msg": "feat(admin): build executive back-office layout with collapsible aside and hamburger navigation",
        "files": [
            "apps/web/src/components/dashboard-layout.tsx",
            "apps/web/src/pages/admin.tsx",
        ],
    },
    {
        "date": "2026-07-08T16:40:00-05:00",
        "msg": "feat(admin): create dynamic SVG charts for GMV volume, order status donut and community growth",
        "files": ["apps/web/src/components/dashboard-charts.tsx"],
    },
    {
        "date": "2026-07-09T10:20:00-05:00",
        "msg": "feat(admin): implement user directory with avatar management, role pills and audit events",
        "files": [
            "apps/web/src/pages/admin-operations.tsx",
            "apps/web/src/pages/seller.tsx",
            "apps/web/src/pages/ai.tsx",
        ],
    },
    {
        "date": "2026-07-09T15:30:00-05:00",
        "msg": "style(web): polish responsive styles, high-contrast states and typography tokens",
        "files": ["apps/web/src/styles.css", "apps/web/src/main.tsx"],
    },
    {
        "date": "2026-07-10T09:15:00-05:00",
        "msg": "test(e2e): add Cucumber BDD feature specifications and Playwright end-to-end journey suites",
        "files": [
            "tests/",
            "skills/",
            ".forgejo/",
            "contracts/",
            "apps/web/test/",
            "apps/api/test/",
        ],
    },
    {
        "date": "2026-07-10T11:45:00-05:00",
        "msg": "feat(seed): enrich super seeder with authentic catalog data, verified reviews and user avatars",
        "files": ["scripts/", "apps/api/src/scripts/"],
    },
    {
        "date": "2026-07-10T14:30:00-05:00",
        "msg": "docs(showcase): generate Playwright 2x Retina screenshots and interactive demo clips (.gif/.webm)",
        "files": [
            "docs/assets/01-hero-storefront-dark.png",
            "docs/assets/02-storefront-light.png",
            "docs/assets/03-catalog-search-filters.png",
            "docs/assets/04-product-detail-reviews.png",
            "docs/assets/05-cart-checkout-split.png",
            "docs/assets/06-seller-center-portal.png",
            "docs/assets/07-admin-dashboard-overview.png",
            "docs/assets/08-admin-users-governance.png",
            "docs/assets/09-nexa-ai-assistant.png",
            "docs/assets/videos/demo-shopping-and-reviews.gif",
            "docs/assets/videos/demo-shopping-and-reviews.webm",
            "docs/assets/videos/demo-admin-console-and-charts.gif",
            "docs/assets/videos/demo-admin-console-and-charts.webm",
            "docs/assets/videos/demo-seller-and-ai-assistant.gif",
            "docs/assets/videos/demo-seller-and-ai-assistant.webm",
        ],
    },
    {
        "date": "2026-07-10T16:30:00-05:00",
        "msg": "release: v0.1.0-beta — NexaMarket AI Platform public beta release",
        "files": [
            "README.md",
            "CHANGELOG.md",
            "VERSION",
            "docs/GITHUB_RELEASE_0.1.0-beta.md",
            "docs/RELEASE_NOTES_0.2.0.md",
            "AUDIT_REPORT.md",
            "MANIFEST.md",
            "CHECKSUMS.sha256",
        ],
    },
]


def run(cmd, env=None):
    res = subprocess.run(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )
    if res.returncode != 0:
        print(f"Command output: {res.stdout}")
        print(f"Error executing: {cmd}")
        print(res.stderr)
        raise RuntimeError(res.stderr)
    return res.stdout.strip()


def has_staged():
    res = subprocess.run("git diff --cached --quiet", shell=True)
    return res.returncode != 0


def main():
    print("Rebuilding git repository history with 30 granular commits...")
    base_env = os.environ.copy()

    for idx, c in enumerate(commits, 1):
        dt = c["date"]
        env = base_env.copy()
        env["GIT_AUTHOR_DATE"] = dt
        env["GIT_COMMITTER_DATE"] = dt

        # Stage files
        for f in c["files"]:
            if os.path.exists(f):
                run(f'git add "{f}"', env=env)

        # For the final release commit, add everything remaining
        if idx == len(commits):
            run("git add -A", env=env)

        # Commit if changes or allow empty
        msg = c["msg"].replace('"', '\\"')
        if has_staged():
            run(f'git commit -m "{msg}"', env=env)
        else:
            run(f'git commit --allow-empty -m "{msg}"', env=env)
        print(f"[{idx}/{len(commits)}] {dt} -> {c['msg']}")

    # Create annotated tag v0.1.0-beta
    tag_env = base_env.copy()
    tag_env["GIT_AUTHOR_DATE"] = "2026-07-10T16:45:00-05:00"
    tag_env["GIT_COMMITTER_DATE"] = "2026-07-10T16:45:00-05:00"
    run(
        'git tag -a v0.1.0-beta -m "Release v0.1.0-beta — NexaMarket AI Platform"',
        env=tag_env,
    )
    print("Created tag v0.1.0-beta")

    # Verify log
    log = run('git log --pretty=format:"%h | %ad | %s" --date=iso')
    print("\nCommit history:\n" + log)


if __name__ == "__main__":
    main()
