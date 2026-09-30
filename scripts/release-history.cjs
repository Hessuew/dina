async function collectCompareHistory(github, request, perPage = 100) {
  const commits = []

  for (let page = 1; ; page += 1) {
    const response = await github.rest.repos.compareCommits({
      ...request,
      page,
      per_page: perPage,
    })
    const pageCommits = response.data.commits ?? []
    commits.push(...pageCommits)
    if (pageCommits.length < perPage) break
  }

  const files = []
  for (const commit of commits) {
    const response = await github.rest.repos.getCommit({
      owner: request.owner,
      repo: request.repo,
      ref: commit.sha,
    })
    const commitFiles = response.data.files
    if (!Array.isArray(commitFiles)) {
      throw new Error(`Commit file list was unavailable for ${commit.sha}`)
    }
    if (commitFiles.length >= 300) {
      throw new Error(`Commit file list may be truncated for ${commit.sha}`)
    }
    files.push(...commitFiles)
  }

  return { commits, files }
}

module.exports = { collectCompareHistory }
