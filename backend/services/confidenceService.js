function scoreBusiness(evidence) {
  let score = 0;

  if (evidence.website) score += 20;
  if (evidence.pageTitle) score += 20;
  if (evidence.phoneFound) score += 30;
  if (evidence.addressFound) score += 30;

  return score;
}

module.exports = { scoreBusiness };