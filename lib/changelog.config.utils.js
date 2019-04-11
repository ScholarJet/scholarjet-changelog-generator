const _ = require('lodash');

function _toPlural(ticketTypeName) {
  switch (ticketTypeName) {
    case 'Story':
    case 'story':
      return 'Stories';
    case 'Bug':
    case 'bug':
      return 'Bug Fixes';
    default:
      return ticketTypeName;
  }
}

function updatePRInCommit(commit, gitHubUrl) {
  const regex = /\((#+[0-9]+)\)/g;
  let prsInSummary = commit.summary.match(regex);

  if (!prsInSummary) {
    return commit;
  }

  let newSummary = commit.summary;

  prsInSummary.forEach(prKey => {
    const prNumber = prKey.replace('#', '').replace('(', '').replace(')', '');
    newSummary = newSummary.split(prKey).join(`[${prKey}](${gitHubUrl}/pull/${prNumber})`);
  });

  return {
    ...commit,
    summary: newSummary
  }
}

function _updateJiraTicket(jiraTicket) {
  let updatedTicket = {
    ...jiraTicket
  };

  updatedTicket.tickets = updatedTicket.tickets.map(ticket => {
    const updatedCommits = ticket.commits.map(updatePRInCommit);
    return {
      ...ticket,
      commits: updatedCommits
    }
  });

  return updatedTicket;
}

/**
 * Returns an updated list of stories and bugs with the given sub task either added to an existing story/bug or
 * added to a new story/bug.
 *
 * @param storiesAndBugs
 * @param subTask
 */
function _updateStoriesAndBugs(storiesAndBugs, subTask) {
  const update = [...storiesAndBugs];

  let parentIndex = update.findIndex(ticket => ticket.key === subTask.fields.parent.key);

  if (parentIndex === -1) {
    const parent = subTask.fields.parent;
    update.push(Object.assign({}, parent,
      { commits: [], issueType: parent.fields.issuetype, issueTypeName: parent.fields.issuetype.name }));
    parentIndex = update.length - 1;
  }

  if (!update[parentIndex].subTasks) {
    update[parentIndex].subTasks = [];
  }

  update[parentIndex].subTasks.push(subTask);

  return update;
}

/**
 * Returns a list of tickets (excluding sub-tasks) with a new property subTasks which contains the respective sub tasks found in the given
 * list of sub tasks.
 *
 * @param tickets
 * @param subTasks
 * @returns Array of updated tickets
 */
function _updateTicketSubTasks(tickets, subTasks) {
  let updated = tickets.filter(ticket => ticket.issueTypeName !== 'Sub-task');

  for (let i = 0; i < subTasks.length; i++) {
    updated = _updateStoriesAndBugs(tickets, subTasks[i]);
  }

  return updated
}

/**
 * Returns an object that contains the stories and bugs with their respective sub-tasks.
 *
 * Note that the sub-tasks are only displayed if they are found in one of the commits.
 *
 * @param tickets an array of tickets
 * @returns Array of updated tickets
 */
function _getTicketsWithSubTasks(tickets) {
  return _updateTicketSubTasks(tickets.filter(ticket => ticket.issueTypeName !== 'Sub-task'),
    tickets.filter(ticket => ticket.issueTypeName === 'Sub-task'));
}

/**
 * Returns the given list of tickets with nested issue type information added to each ticket as properties
 * @param tickets
 * @returns {*}
 */
function _simplifyIssueTypeInformation(tickets) {
  return tickets.map(ticket => ({
    ...ticket,
    issueType: ticket.fields.issuetype,
    issueTypeName: ticket.fields.issuetype.name
  }));
}

function processTicketsForTemplateUsage(tickets) {
  return _.chain(_getTicketsWithSubTasks(_simplifyIssueTypeInformation(tickets)))
    .groupBy('issueTypeName')
    .map((tickets, issueTypeName) => ({issueTypeName: _toPlural(issueTypeName), tickets}))
    .value().map(ticket => _updateJiraTicket(ticket));
}

module.exports = {
  updatePRInCommit,
  processTicketsForTemplateUsage
};
