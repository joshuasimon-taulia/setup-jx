import * as run from './run'
import * as os from 'os'
import * as toolCache from '@actions/tool-cache'
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'

describe('run.ts', () => {
   test('getExecutableExtension() - return .exe when os is Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(run.getExecutableExtension()).toBe('.exe')
      expect(os.type).toBeCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')

      expect(run.getExecutableExtension()).toBe('')
      expect(os.type).toBeCalled()
   })

   test('getJxDownloadURL() - return the URL to download jx for Linux', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValueOnce('unknown')
      const jxLinuxUrl = 'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-linux-amd64.tar.gz'

      expect(run.getJxDownloadURL('v3.10.45')).toBe(jxLinuxUrl)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()

      // arm64
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValueOnce('arm64')
      const jxLinuxArm64Url =
         'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-linux-arm64.tar.gz'

      expect(run.getJxDownloadURL('v3.10.45')).toBe(jxLinuxArm64Url)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()
   })

   test('getJxDownloadURL() - return the URL to download jx for Darwin', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      jest.spyOn(os, 'arch').mockReturnValueOnce('unknown')
      const jxDarwinUrl = 'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-darwin-amd64.tar.gz'

      expect(run.getJxDownloadURL('v3.10.45')).toBe(jxDarwinUrl)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()

      // arm64
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      jest.spyOn(os, 'arch').mockReturnValueOnce('arm64')
      const jxDarwinArm64Url =
         'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-darwin-arm64.tar.gz'

      expect(run.getJxDownloadURL('v3.10.45')).toBe(jxDarwinArm64Url)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()
   })

   test('getValidVersion() - return version with v prepended', () => {
      expect(run.getValidVersion('3.10.45')).toBe('v3.10.45')
   })

   test('getJxDownloadURL() - return the URL to download jx for Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      const jxWindowsUrl = 'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-windows-amd64.zip'
      expect(run.getJxDownloadURL('v3.10.45')).toBe(jxWindowsUrl)
      expect(os.type).toBeCalled()
   })

   test('getLatestJxVersion() - return the stable version of JX since its not authenticated', async () => {
      expect(await run.getLatestJxVersion()).toBe('v3.10.45')
   })

   test('walkSync() - return path to the all files matching fileToFind in dir', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent,
               'file2' as unknown as fs.Dirent,
               'folder1' as unknown as fs.Dirent,
               'folder2' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent,
               'file12' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent,
               'file22' as unknown as fs.Dirent
            ]
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return { isDirectory: () => isDirectory } as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'file21')).toEqual([
         path.join('mainFolder', 'folder2', 'file21')
      ])
      expect(fs.readdirSync).toBeCalledTimes(3)
      expect(fs.statSync).toBeCalledTimes(8)
   })

   test('walkSync() - return empty array if no file with name fileToFind exists', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent,
               'file2' as unknown as fs.Dirent,
               'folder1' as unknown as fs.Dirent,
               'folder2' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent,
               'file12' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent,
               'file22' as unknown as fs.Dirent
            ]
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return { isDirectory: () => isDirectory } as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'jx.exe')).toEqual([])
      expect(fs.readdirSync).toBeCalledTimes(3)
      expect(fs.statSync).toBeCalledTimes(8)
   })

   test('findJx() - change access permissions and find the jx in given directory', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => { })
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder') return ['jx.exe' as unknown as fs.Dirent]
      })
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return { isDirectory: () => isDirectory } as fs.Stats
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(run.findJx('mainFolder')).toBe(
         path.join('mainFolder', 'jx.exe')
      )
   })

   test('findJx() - throw error if executable not found', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => { })
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder') return []
      })
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         return { isDirectory: () => true } as fs.Stats
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      expect(() => run.findJx('mainFolder')).toThrow(
         'jx executable not found in path mainFolder'
      )
   })

   test('downloadJx() - download jx and return path to it', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify([{ tag_name: 'v4.0.0' }])
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => { })
      jest
         .spyOn(toolCache, 'extractTar')
         .mockResolvedValue('pathToUnzippedJx')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => ['jx.exe' as unknown as fs.Dirent])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return { isDirectory: () => isDirectory } as fs.Stats
      })

      expect(await run.downloadJx('v4.0.0')).toBe(
         path.join('pathToCachedDir', 'jx.exe')
      )
      expect(toolCache.find).toBeCalledWith('jx', 'v4.0.0')
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/jenkins-x/jx/releases/download/v4.0.0/jx-windows-amd64.zip'
      )
      expect(fs.chmodSync).toBeCalledWith('pathToTool', '777')
      expect(toolCache.extractTar).toBeCalledWith('pathToTool')
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToCachedDir', 'jx.exe'),
         '777'
      )
   })

   test('downloadJx() - throw error if unable to download', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download'
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      await expect(run.downloadJx('v3.10.45')).rejects.toThrow(
         'Failed to download jx from location https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-windows-amd64.zip'
      )
      expect(toolCache.find).toBeCalledWith('jx', 'v3.10.45')
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-windows-amd64.zip'
      )
   })

   test('downloadJx() - return path to jx tool with same version from toolCache', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => { })

      expect(await run.downloadJx('v3.10.45')).toBe(
         path.join('pathToCachedDir', 'jx.exe')
      )
      expect(toolCache.find).toBeCalledWith('jx', 'v3.10.45')
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToCachedDir', 'jx.exe'),
         '777'
      )
   })

   test('downloadJx() - throw error is jx is not found in path', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest
         .spyOn(toolCache, 'extractTar')
         .mockResolvedValue('pathToUnzippedJx')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return { isDirectory: () => isDirectory } as fs.Stats
      })

      await expect(run.downloadJx('v3.10.45')).rejects.toThrow(
         'jx executable not found in path pathToCachedDir'
      )
      expect(toolCache.find).toBeCalledWith('jx', 'v3.10.45')
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/jenkins-x/jx/releases/download/v3.10.45/jx-windows-amd64.zip'
      )
      expect(fs.chmodSync).toBeCalledWith('pathToTool', '777')
      expect(toolCache.extractTar).toBeCalledWith('pathToTool')
   })
})
