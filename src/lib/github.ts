// ============================================
// CareerOS 2.0 — GitHub Profile Analyzer
// ============================================

export interface GitHubStats {
  username: string;
  public_repos: number;
  total_stars: number;
  languages: Record<string, number>;
  top_repos: Array<{
    name: string;
    description: string;
    stars: number;
    language: string;
    topics: string[];
  }>;
}

export async function getGitHubProfileData(username: string): Promise<GitHubStats | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };
  
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    // 1. Fetch User Data
    const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!userRes.ok) return null;
    const userData = await userRes.ok ? await userRes.json() : null;

    // 2. Fetch Repos (Sorted by stars)
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=stargazers&per_page=100`, { headers });
    if (!reposRes.ok) return null;
    const repos = await reposRes.json();

    let totalStars = 0;
    const languages: Record<string, number> = {};
    const topRepos = repos.slice(0, 5).map((repo: any) => {
      totalStars += repo.stargazers_count;
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
      return {
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        topics: repo.topics || [],
      };
    });

    return {
      username: userData.login,
      public_repos: userData.public_repos,
      total_stars: totalStars,
      languages,
      top_repos: topRepos,
    };
  } catch (error) {
    console.error("GitHub API error:", error);
    return null;
  }
}
