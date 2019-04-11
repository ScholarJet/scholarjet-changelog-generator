
function getTicketsAndCommitsSection() {
  return `
## Commits and Jira Tickets
<% tickets.all.forEach((ticketWrapper) => { %>
### <%= ticketWrapper.issueTypeName %>
<% ticketWrapper.tickets.forEach((ticket) => { %>
* <%= '**['+ ticket.key + '](' + jira.baseUrl + '/browse/' + ticket.key + ')** ' + ticket.fields.summary %>

<% if ( ticket.subTasks && ticket.subTasks.length ) { -%>
  ##### Sub Tasks
<% ticket.subTasks.forEach((subTask) => { %>
  * <%= '**['+ subTask.key + '](' + jira.baseUrl + '/browse/' + subTask.key + ')** ' + subTask.fields.summary %>
<% if (subTask.commits && subTask.commits.length ) { -%>
<% subTask.commits.forEach((commit) => { %><%= '    * ([' + commit.revision.substr(0, 7) + '](' + githubUrl + '/commit/' + commit.revision.substr(0, 7) + ')) ' + commit.summary %><% }) %>
<% } -%>
<% }) -%>
<% } %>

<% if (ticket.commits && ticket.commits.length ) { -%>
##### Commits
<% ticket.commits.forEach((commit) => { %><%= '  * ([' + commit.revision.substr(0, 7) + '](' + githubUrl + '/commit/' + commit.revision.substr(0, 7) + ')) ' + commit.summary %><% }) %>
<% } -%>
<% }); -%>
<% }); -%>
`
}

export function generateTemplate(gitHubUrl, releaseNamePrefix) {
  const templ = `
  <%
const githubUrl = '${gitHubUrl}';
-%>
<% if (jira.releaseVersions && jira.releaseVersions.length) { -%>
<%
  const gitTag = jira.releaseVersions[0].name.replace('${releaseNamePrefix}', ''); 
%>
# [<%= gitTag %>](<%= githubUrl + '/releases/tag/v' + gitTag %>) ([Jira](<%= jira.baseUrl + '/projects/' + jira.projectName + '/versions/' + jira.releaseVersions[0].id %>))<% }-%> (${NOW})

${getTicketsAndCommitsSection()}

<% if (!tickets.all.length) {%> ~ None ~ <% } %>
### Other Commits
---------------------
<% commits.noTickets.forEach((commit) => { %>
* <%= commit.slackUser ? '@'+commit.slackUser.name : commit.authorName %> - ([<%= commit.revision.substr(0, 7) %>](<%= githubUrl + '/commit/' + commit.revision.substr(0, 7) %>)) - <%= commit.summary -%>
<% }); -%>
<% if (!commits.noTickets.length) {%> ~ None ~ <% } %>
`;

  console.log('>>>> Template', templ);
  return templ;
}
