const {processTicketsForTemplateUsage, updatePRInCommit} = require('./changelog.config.utils');

/**
 * ConfigurationOptions type definition
 * @typedef {Object} ConfigurationOptions
 * @property {string} jiraEmail
 * @property {string} jiraPassword
 * @property {string} jiraToken
 * @property {string} projectName
 * @property {string} repositoryUrl
 * @property {string} releaseNamePrefix
 * @property {string} baseUrl
 */


/**
 * jira-changelog configuration JIRA type definition
 * @typedef {Object} JiraChangelogConfigurationJira
 * @property {Object} api
 * @property {string} baseUrl
 * @property {string} project
 * @property {string} ticketIDPattern
 * @property {Array} approvalStatus
 * @property {Array} excludeIssueTypes
 * @property {Array} includeIssueTypes
 * @property {Function} generateReleaseVersionName
 */

/**
 * jira-changelog configuration type definition
 * @typedef {Object} JiraChangelogConfiguration
 * @property {JiraChangelogConfigurationJira} jira
 * @property {Object} [slack]
 * @property {string} slack.apiKey
 * @property {string} slack.channel
 * @property {string} slack.username
 * @property {string} slack.icon_emoji
 * @property {string} slack.icon_url
 * @property {Object} [sourceControl]
 * @property {Object} [sourceControl.defaultRange]
 * @property {string} [sourceControl.defaultRange.from]
 * @property {string} [sourceControl.defaultRange.to]
 * @property {Function} transformData
 * @property {Function} transformForSlack
 * @property {string} template
 */

/**
 *
 * @param {ConfigurationOptions} configurationOptions
 * @return {JiraChangelogConfiguration} the resulting Jira configuration
 */
function generateConfiguration(configurationOptions) {
    const now = new Date().toISOString().slice(0, 10);
    return {

        // Jira integration
        jira: {

            // API
            api: {
                host: 'scholarjet.atlassian.net',
                email: configurationOptions.jiraEmail,
                token: configurationOptions.jiraToken,
            },

            // Jira base web URL
            // Set to the base URL for your Jira account
            baseUrl: 'https://scholarjet.atlassian.net',

            // The Jira project name (use for creating release versions)
            project: configurationOptions.projectName,

            // Regex used to match the issue ticket key
            // Use capture group one to isolate the key text within surrounding characters (if needed).
            ticketIDPattern: /([A-Z]+\-[0-9]+)/i,

            // Status names that mean the ticket is approved.
            approvalStatus: ['Done', 'Closed', 'Accepted'],

            // Tickets to exclude from the changelog, by type name
            excludeIssueTypes: [],

            // Tickets to include in changelog, by type name.
            // If this is defined, `excludeIssueTypes` is ignored.
            includeIssueTypes: [],

            // Get the release version name to use when using `--release` without a value.
            // Returns a Promise
            generateReleaseVersionName: function () {
                const haikunator = new Haikunator();
                return Promise.resolve(haikunator.haikunate());
            }
        },

        // Slack API integration
        slack: {

            // API key string
            apiKey: undefined,

            // The channel that the changelog will be posted in, when you use the `--slack` flag.
            // This can be a channel string ('#mychannel`) or a channel ID.
            channel: undefined,

            // The name to give the slack bot user, when posting the changelog
            username: "Changelog Bot",

            // Emoji to use for the bot icon.
            // Cannot be used at the same time as `icon_url`
            icon_emoji: ":clipboard:",

            // URL to an image to use as the icon for the bot.
            // Cannot be used at the same time as `icon_emoji`
            icon_url: undefined
        },

        // Github settings
        sourceControl: {

            // Default range for commits.
            // This can include from/to git commit references
            // and or after/before datestamps.
            defaultRange: {
                from: "origin/development",
                to: "origin/master"
            }
        },

        // Transforms the basic changelog data before it goes to the template.
        //  data - The changlelog data.
        transformData: ((repositoryUrl) => {
            return function (data) {
                let newData = {...data};

                newData.tickets.approved = processTicketsForTemplateUsage(newData.tickets.approved, repositoryUrl);
                newData.tickets.all = processTicketsForTemplateUsage(newData.tickets.all, repositoryUrl);
                newData.commits.noTickets = newData.commits.noTickets.map(commit =>
                  updatePRInCommit(commit, repositoryUrl));

                return Promise.resolve(newData);
            }
        })(configurationOptions.repositoryUrl),

        // Transform the changelog before posting to slack
        //  content - The changelog content which was output by the command
        //  data - The data which generated the changelog content.
        transformForSlack: function (content, data) {
            return Promise.resolve(content);
        },

        // The template that generates the output, as an ejs template.
        // Learn more: http://ejs.co/
        template:
            `<%
const githubUrl = '${configurationOptions.repositoryUrl}';
-%>
<% if (jira.releaseVersions && jira.releaseVersions.length) { -%>
<%
  const gitTag = jira.releaseVersions[0].name.replace('portal-', '');
%>
# [<%= gitTag %>](<%= githubUrl + '/releases/tag/v' + gitTag %>) ([Jira](<%= jira.baseUrl + '/projects/${configurationOptions.projectName}/versions/' + jira.releaseVersions[0].id %>))<% }-%> (${now})

## Commits and Jira Tickets
<% tickets.all.forEach((ticketWrapper) => { -%>
### <%= ticketWrapper.issueTypeName %>
<% ticketWrapper.tickets.forEach((ticket) => { %>
* <%= '**['+ ticket.key + '](' + jira.baseUrl + '/browse/' + ticket.key + ')** ' + ticket.fields.summary %>
  ##### Sub Tasks & Commits
<% if ( ticket.subTasks && ticket.subTasks.length ) { -%>
<% ticket.subTasks.forEach((subTask) => { -%>
  * <%= '['+ subTask.key + '](' + jira.baseUrl + '/browse/' + subTask.key + ') ' + subTask.fields.summary %>
<% if (subTask.commits && subTask.commits.length ) { -%>
<% subTask.commits.forEach((commit) => { %><%= '    * ([' + commit.revision.substr(0, 7) + '](' + githubUrl + '/commit/' + commit.revision.substr(0, 7) + ')) ' + commit.summary %><% }) %>
<% } -%>
<% }) -%>
<% } -%>
<% if (ticket.commits && ticket.commits.length ) { -%>
<% ticket.commits.forEach((commit) => { %><%= '    * ([' + commit.revision.substr(0, 7) + '](' + githubUrl + '/commit/' + commit.revision.substr(0, 7) + ')) ' + commit.summary %><% }) %>
<% } -%>
<% }); -%>
<% }); -%>

### Other Commits
---------------------
<% commits.noTickets.forEach((commit) => { %>
* <%= commit.slackUser ? '@'+commit.slackUser.name : commit.authorName %> - ([<%= commit.revision.substr(0, 7) %>](<%= githubUrl + '/commit/' + commit.revision.substr(0, 7) %>)) - <%= commit.summary -%>
<% }); -%>
<% if (!commits.noTickets.length) {%> ~ None ~ <% } -%>

`
    };
}

module.exports = {generateConfiguration};
