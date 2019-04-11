const Config = require('jira-changelog').Config;
const SourceControl = require('jira-changelog').SourceControl;
const Jira = require('jira-changelog').Jira;
const jiraUsername = process.env.JIRA_EMAIL;
const jiraPassword = process.env.JIRA_PASSWORD;
const {generateConfiguration} = require('./lib/get-configuration');
const commander = require('commander');
const path = require('path');
const CONFIG_PATH = './changelog-generator.config.js';

/**
 * ProjectOptions type definition
 * @typedef {Object} ProjectOptions
 * @property {string} projectName
 * @property {string} repositoryUrl
 * @property {string} releaseNamePrefix
 */

function run() {
    return _run.apply(this, arguments);
}

function _run() {
    console.log('Running ScholarJet Changelog Generator');
    commandLineArgs();

    /**
     * @type ProjectOptions
     */
    const config = require(CONFIG_PATH);

    const changelogConfig =  generateConfiguration({
        jiraEmail: jiraUsername,
        jiraPassword: jiraUsername,
        projectName: config.projectName,
        repositoryUrl: config.repositoryUrl,
        releaseNamePrefix: config.releaseNamePrefix
    });

    // Get commits for a range
    const source = new SourceControl(changelogConfig);
    const range = {
        from: "origin/master",
        to: "master"
    };
    source.getCommitLogs(process.cwd(), range).then((commitLogs) => {

        // Associate git commits with jira tickets and output changelog object
        const jira = new Jira(changelogConfig);
        jira.generate(commitLogs).then((changelog) => {
            console.log(changelog);
        });

    });
}

/**
 *
 */
function commandLineArgs() {
    const pkg = require('./package.json');

    commander
        .version(pkg.version).option('-c, --config <filepath>', 'Path to the config file.')
        .option('-r, --range <from>...<to>', 'git commit range for changelog')
        .option('-d, --date <date>[...date]', 'Only include commits after this date')
        .option('-s, --slack', 'Automatically post changelog to slack (if configured)')
        .option('--release [release]', 'Assign a release version to these stories')
        .parse(process.argv);
}

run();
