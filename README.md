# changelog-generator
Tool to generate changelogs

## Setup

Add credentials through environment variables

```bash

$ export JIRA_EMAIL=your@email.com

$ export JIRA_TOKEN=jira_api_token

```

Note: Visit [this](https://confluence.atlassian.com/cloud/api-tokens-938839638.html) link to learn how to get a JIRA API token

## Installation 


Install using npm

```bash

$ npm install --save-dev ScholarJet/scholarjet-changelog-generator

```



Create the [jira-changelog](https://github.com/jgillick/jira-changelog) configuration file in the root of your project and add the configuration:

```javascript
// changelog.config.js

const GITHUB_URL = 'https://github.com/ScholarJet/scholarjet-portal'; // change this to the appropriate repo
const {generateConfiguration} = require('scholarjet-changelog-generator/lib/get-configuration');

const RELEASE_NAME_PREFIX = 'release-';

// noinspection JSUnusedGlobalSymbols
module.exports = { ...generateConfiguration({
    jiraEmail: process.env.JIRA_EMAIL,
    jiraToken: process.env.JIRA_TOKEN,
    projectName: 'SJ',
    repositoryUrl: GITHUB_URL,
    releaseNamePrefix: RELEASE_NAME_PREFIX
  })
};

```

Don't forget to update the configuration above with the appropriate information.

## Running

Run jira-changelog

```bash
$ jira-changelog --range development...master --release "portal-1.12.0" > CHANGELOG.tmp
```


