function scoreBusiness(evidence) {
  let score = 0;

  // Website successfully reached
  if (evidence.reachable) {
    score += 20;
  }

  // Company name appears on the crawled pages
  if (evidence.businessNameFound) {
    score += 20;
  }

  // Phone evidence found
  if (
    evidence.phoneFound &&
    Array.isArray(evidence.phones) &&
    evidence.phones.length > 0
  ) {
    score += 20;
  }

  // Address evidence found
  if (
    evidence.addressFound &&
    Array.isArray(evidence.addresses) &&
    evidence.addresses.length > 0
  ) {
    score += 20;
  }

  // Email evidence found
  if (
    evidence.emailFound &&
    Array.isArray(evidence.emails) &&
    evidence.emails.length > 0
  ) {
    score += 10;
  }

  // More than one page successfully researched
  if (
    Array.isArray(evidence.pagesVisited) &&
    evidence.pagesVisited.filter(
      (page) => !page.failed && !page.soft404
    ).length >= 2
  ) {
    score += 10;
  }

  // Never exceed 100
  return Math.min(score, 100);
}

module.exports = {
  scoreBusiness,
};
