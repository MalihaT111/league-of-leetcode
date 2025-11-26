PROFILE_QUERY = """
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        userAvatar
        realName
        aboutMe
      }
    }
  }
"""

PROBLEM_QUERY = """
  query selectProblem($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
          questionId
          title
          titleSlug
          content
          difficulty
          stats
          topicTags {
              name
          }
      }
  }
"""
        
RANDOM_QUESTION_QUERY = """
  query randomQuestionV2($favoriteSlug: String, $categorySlug: String, $searchKeyword: String, $filtersV2: QuestionFilterInput) {
    randomQuestionV2(
      favoriteSlug: $favoriteSlug
      categorySlug: $categorySlug
      filtersV2: $filtersV2
      searchKeyword: $searchKeyword
    ) {
      titleSlug
    }
  }
"""

RECENT_AC_SUBMISSIONS_QUERY = """
  query recentAcSubmissions($username: String!, $limit: Int) {
      recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
          lang
          runtime
          memory
      }
  }
"""

QUESTION_STATS_QUERY = """
  query getUserProfile($username: String!) {
      matchedUser(username: $username) {
          username
          submitStats {
              acSubmissionNum {
                  difficulty
                  count
              }
          }
      }
  }
"""

MAPPING_QUERY = """
query problemsetQuestionListV2 {
  problemsetQuestionListV2 {
    questions {
      difficulty
      topicTags {
        name
      }
    }
  }
}
"""

SUBMISSION_DETAILS = """
query submissionDetails($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
    runtime
    runtimeDisplay
    runtimePercentile
    runtimeDistribution
    memory
    memoryDisplay
    memoryPercentile
    code
    timestamp
    lang {
      name
      verboseName
    }
  }
}
"""