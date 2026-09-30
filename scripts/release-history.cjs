async function collectCompareHistory(github, request, perPage = 100) {
  const commits = []
  const files = []

  for (let page = 1; ; page += 1) {
    const response = await github.rest.repos.compareCommits({
      ...request,
      page,
      per_page: perPage,
    })
    const pageCommits = response.data.commits ?? []
    const pageFiles = response.data.files ?? []
    commits.push(...pageCommits)
    files.push(...pageFiles)
    if (pageCommits.length < perPage && pageFiles.length < perPage) break
  }

  return { commits, files }
}

module.exports = { collectCompareHistory }
