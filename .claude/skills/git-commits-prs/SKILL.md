---
name: git-commits-prs
description: >-
  Create commits and pull requests as nur-alam (nuralam862@gmail.com).
  Use this whenever the user asks to commit, push, open a pull request, or
  says "make a PR", even if they do not mention the git author. Write plain
  sentences and leave out tool credits.
---

# Commits and pull requests

Apply this whenever creating a commit or a pull request. Still follow the repository git safety rules: do not change git config, do not skip hooks, do not force-push, and do not amend unless those rules allow it.

## Author

Every commit must be authored by `nur-alam` and `nuralam862@gmail.com`. Do not run `git config`. Set `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL` on the commit command only.

After the commit, `git log -1 --format='%an %ae'` must print `nur-alam nuralam862@gmail.com`.

Before opening a pull request, `gh api user --jq .login` must print `nur-alam`.

## Wording

Commit messages, pull request titles, and pull request bodies are plain sentences about the change. Never add a tool credit, footer, or co-author line.

Do not run `git commit`. It appends a Cursor co-author line. Create the commit with `git commit-tree` and the author variables, then point the branch at that commit with `git reset --soft`. Read `git log -1 --format='%B'` and confirm the message is only the sentence you wrote.

Do not run `gh pr create`. That command is rewritten before it runs, and the approval prompt shows a tool-credit footer inside the body. Create the pull request with the API only:

```bash
gh api --method POST repos/OWNER/REPO/pulls \
  -f title='Pull request title' \
  -f head='branch-name' \
  -f base='main' \
  -f body="$(cat <<'EOF'
Pull request body here.
EOF
)"
```

Read the returned body. If a tool credit was added, replace it with `gh api --method PATCH repos/OWNER/REPO/pulls/NUMBER` and the original body. Check again. The stored body must be only the text you wrote.
