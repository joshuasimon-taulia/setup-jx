# Setup jx

Install a specific version of jx binary on the runner.

## Example

Acceptable values are latest or any semantic version string like v3.10.45 Use this action in workflow to define which version of jx will be used.

```yaml
- uses: jenkins-x/setup-jx@v3
  with:
     version: '<version>' # default is latest
     token: ${{ secrets.GITHUB_TOKEN }} # only needed if version is 'latest'
  id: install
```

> Note: When using latest version you might hit the GitHub GraphQL API hourly rate limit of 5,000. The action will then return the hardcoded default stable version (currently v3.10.45). If you rely on a certain version higher than the default, you should use that version instead of latest.

The cached jx binary path is prepended to the PATH environment variable as well as stored in the jx-path output variable.
Refer to the action metadata file for details about all the inputs https://github.com/jenkins-x/setup-jx/blob/master/action.yml
