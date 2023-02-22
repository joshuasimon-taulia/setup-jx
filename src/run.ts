// Copyright (c) jenkins-x Corporation.
// Copyright (c) jenkins-x Corporation.
// Licensed under the MIT license.

import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import { graphql } from '@octokit/graphql'
import { createActionAuth } from '@octokit/auth-action'

const jxToolName = 'jx'
const stableJxVersion = 'v3.10.45'

export async function run() {
   let version = core.getInput('version', { required: true })

   if (version !== 'latest' && version[0] !== 'v') {
      core.info('Getting latest jx version')
      version = getValidVersion(version)
   }
   if (version.toLocaleLowerCase() === 'latest') {
      version = await getLatestJxVersion()
   }

   core.startGroup(`Downloading ${version}`)
   const cachedPath = await downloadJx(version)
   core.endGroup()

   try {
      if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
         core.addPath(path.dirname(cachedPath))
      }
   } catch {
      //do nothing, set as output variable
   }

   core.info(`jx tool version '${version}' has been cached at ${cachedPath}`)
   core.setOutput('jx-path', cachedPath)
}

// Prefixes version with v
export function getValidVersion(version: string): string {
   return 'v' + version
}

// Gets the latest jx version or returns a default stable if getting latest fails
export async function getLatestJxVersion(): Promise<string> {
   try {
      const auth = createActionAuth()
      const graphqlAuthenticated = graphql.defaults({
         request: { hook: auth.hook }
      })
      const { repository } = await graphqlAuthenticated(
         `
            {
               repository(name: "jx", owner: "jenkins-x") {
                  releases(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
                     nodes {
                        tagName
                        isLatest
                        isDraft
                        isPrerelease
                     }
                  }
               }
            }
         `
      )
      const latestValidRelease: string = repository.releases.nodes.find(
         ({ tagName, isLatest, isDraft, isPreRelease }) =>
            isValidVersion(tagName) && isLatest && !isDraft && !isPreRelease
      )?.tagName

      if (latestValidRelease) return latestValidRelease
   } catch (err) {
      core.warning(
         `Error while fetching latest jx release: ${err.toString()}. Using default version ${stableJxVersion}`
      )
      return stableJxVersion
   }

   core.warning(
      `Could not find valid release. Using default version ${stableJxVersion}`
   )
   return stableJxVersion
}

// isValidVersion checks if verison is a stable release
function isValidVersion(version: string): boolean {
   return version.indexOf('rc') == -1
}

export function getExecutableExtension(): string {
   if (os.type().match(/^Win/)) {
      return '.exe'
   }
   return ''
}

const LINUX = 'Linux'
const MAC_OS = 'Darwin'
const WINDOWS = 'Windows_NT'
const ARM64 = 'arm64'
export function getJxDownloadURL(version: string): string {
   const arch = os.arch()
   const operatingSystem = os.type()

   switch (true) {
      case operatingSystem == LINUX && arch == ARM64:
         return util.format(
            'https://github.com/jenkins-x/jx/releases/download/%s/jx-linux-arm64.tar.gz',
            version
         )
      case operatingSystem == LINUX:
         return util.format(
            'https://github.com/jenkins-x/jx/releases/download/%s/jx-linux-amd64.tar.gz',
            version
         )

      case operatingSystem == MAC_OS && arch == ARM64:
         return util.format(
            'https://github.com/jenkins-x/jx/releases/download/%s/jx-darwin-arm64.tar.gz',
            version
         )
      case operatingSystem == MAC_OS:
         return util.format(
            'https://github.com/jenkins-x/jx/releases/download/%s/jx-darwin-amd64.tar.gz',
            version
         )

      case operatingSystem == WINDOWS:
      default:
         return util.format(
            'https://github.com/jenkins-x/jx/releases/download/%s/jx-windows-amd64.zip',
            version
         )
   }
}

export async function downloadJx(version: string): Promise<string> {
   let cachedToolpath = toolCache.find(jxToolName, version)
   if (!cachedToolpath) {
      let jxDownloadPath
      try {
         core.debug(`jxDownloadPath: ${jxDownloadPath}`);
         jxDownloadPath = await toolCache.downloadTool(
            getJxDownloadURL(version)
         )
      } catch (exception) {
         throw new Error(
            `Failed to download jx from location ${getJxDownloadURL(
               version
            )}`
         )
      }

      fs.chmodSync(jxDownloadPath, '777')

      let extractedJxPath = '';
      if (process.platform === 'win32') {
         extractedJxPath = await toolCache.extractZip(jxDownloadPath);
      } else {
         extractedJxPath = await toolCache.extractTar(jxDownloadPath);
      }

      cachedToolpath = await toolCache.cacheDir(
         extractedJxPath,
         jxToolName,
         version
      )
   }

   const jxpath = findJx(cachedToolpath)
   if (!jxpath) {
      throw new Error(
         util.format('jx executable not found in path', cachedToolpath)
      )
   }

   fs.chmodSync(jxpath, '777')
   return jxpath
}

export function findJx(rootFolder: string): string {
   fs.chmodSync(rootFolder, '777')
   var filelist: string[] = []
   walkSync(rootFolder, filelist, jxToolName + getExecutableExtension())
   if (!filelist || filelist.length == 0) {
      throw new Error(
         util.format('jx executable not found in path', rootFolder)
      )
   } else {
      return filelist[0]
   }
}

export var walkSync = function (dir, filelist, fileToFind) {
   var files = fs.readdirSync(dir)
   filelist = filelist || []
   files.forEach(function (file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
         filelist = walkSync(path.join(dir, file), filelist, fileToFind)
      } else {
         core.debug(file)
         if (file == fileToFind) {
            filelist.push(path.join(dir, file))
         }
      }
   })
   return filelist
}

run().catch(core.setFailed)
