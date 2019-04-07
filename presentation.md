```css
/* @theme theme */

@import url('https://fonts.googleapis.com/css?family=Cantarell|Roboto:400,400i,700,700i');

section {
  background-color: black;
  color: white;
  font-family: Roboto;
  font-size: 25px;
  line-height: 1.5;
  padding: 0 4em;
}

.small + pre code {
  font-size: 20px;
  line-height: 1.2;
}

.join-above + * {
  padding-bottom: 0;
}
.join-below + * {
  padding-top: 0;
}

h1, h2, h3 {
  font-family: Cantarell;
  font-weight: 500;
  text-align: center;
}

h1 {
  font-size: 60px;
  padding-top: 15%;
}

h2 {
  font-size: 45px;
  padding-top: 5%;
}

a, a:visited {
  color: #2980B9;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

:not(pre)>code[class*=language-], pre[class*=language-] {
  background: none !important;
}
```

<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.16.0/prism.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.16.0/components/prism-bash.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.16.0/components/prism-ini.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.16.0/components/prism-yaml.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.16.0/themes/prism-okaidia.min.css">

# The Flatpak Building Guide

---

## Battle Strategy

### Assumptions

- You need to be comfortable with the terminal! (Some Git may be helpful but isn't 100%
  necessary.)

### How does it all work?

First we'll cover some of how Flatpak works. It's not entirely necessary to know everything,
but it will make some of the more powerful Flatpak constructs more intuitive.

### The building

Then we'll get to how to actually build Flatpaks!

---

## Some Terminology

- Repository: An OSTree repository (will be explained in 5min)
- Runtime: A collection of core libraries and binaries that your Flatpak uses.
  - Platform: A name used to refer to the runtimes that most of your apps will use.
    - `org.freedesktop.Platform`: The runtime most of your apps will use. Current version is
      18.08, which most of your apps should be using.
    - `org.gnome.Platform`, `org.kde.Platform`: Same as the fd.o platform, but with
      extra libraries for GNOME and KDE apps, respectively.
  - SDK: A runtime that has development headers, libraries, and tools. Can be used
    for building apps, or as the runtime for IDEs and other development tools. If it is
    used as the runtime, all SDK extensions will also be available (explained later).
    - `org.freedesktop.Sdk`: The SDK that corresponds to `org.freedesktop.Platform`.
    - `org.gnome.Platform`, `org.kde.Platform`: Take a guess!
- ID: A unique reverse-DNS identifier your app has (e.g. `org.gnome.Books`).

---

## OSTree Repositories

- Think Git for operating systems / binary files.
- Flatpak stores everything in an OSTree repository:
  - System installation: `/var/lib/flatpak/repo`
  - User installation: `~/.local/share/flatpak/repo`
- Objects are the individual items: either files, directory metadata, or a directory tree.
- Instead of branches, we have *refs*, which still point to "comments".
- Not familiar with Git?
  - A *commit* is a set of related changes to a binary file tree.
  - A *ref* is a named, potentially moving pointer to a commit.
- The filesystem tree your app sees is a tree of hardlinks that point to the blobs
  inside the repo, known as a *checkout*.
- Thanks to OSTree, **all files with identical contents have one on-disk copy.**
  (All instances of the file simply point to the same blob.)

---

## Flatpak and OSTree (cont.)

All your installed apps, runtimes, etc are stored as refs in the Flatpak OSTree repo!
When you build an app, it "checks in" the files into the repo and stores it as a ref.
Then, on the user's system, the commit your ref points to is downloaded (via a *pull*),
and then a tree of hardlinks pointing into the repo's objects is "checked out".

This is why all identical files are de-duplicated: they will simply be stored under the
same object.

<div class="small"></div>

```bash
$ ostree --repo=/var/lib/flatpak/repo refs  # View the refs in your repo.
gnome-nightly:runtime/org.gnome.Sdk/x86_64/master
deploy/app/org.electronjs.Electron2.BaseApp/x86_64/18.08
...
```

---

## Names in Flatpak

<h3><code>
<span style="border-bottom: 3px solid #f44168; padding-bottom: 10px;">org.freedesktop.Platform</span><!--
-->/<span style="border-bottom: 3px solid #4286f4; padding-bottom: 10px;">x86_64</span><!--
-->/<span style="border-bottom: 3px solid #00771b; padding-bottom: 10px;">18.08</span></code></h3>

<!-- org.freedesktop.Platform/x86_64/18.08 -->

<h3><code>
<pre>           app-id         arch  branch</pre>
</code></h3>

- <span style="color: #f44168">app-id</span> is the unique, reverse-DNS application ID.
- <span style="color: #4286f4">arch</span> is the application's architecture (usually one of
  x86, x86_64, arm, aarch64).
- <span style="color: #00771b">branch</span> is used to differenciate between multiple builds
  of the same app. Common branch names include "stable", "latest", and "master" (usually for
  nightlies). For runtimes, branches are primarily used to separate different versions. For
  instance, version 18.08 of the freedesktop platform is available as
  `org.freedesktop.Platform/x86_64/18.08`.

---

## Names in Flatpak (shorthand)

You can omit some parts of the name to have Flatpak automatically figure stuff out. These all
mean the same thing:

- `org.gnome.Photos/x86_64/stable`
- `org.gnome.Photos//stable`
- `org.gnome.Photos/x86_64/`
- `org.gnome.Photos/x86_64`
- `org.gnome.Photos`

The second notation (with the `//` is one you'll see often.)

---

## Metadata

Your Flatpaks will contain a metadata file, describing the metadata and permissions:

<div class="small join-above"></div>

```bash
$ flatpak info -m org.gnome.Fractal  # comments added for readability
```

<div style="display: inline" class="small join-below"></div>

```ini
[Application]
name=org.gnome.Fractal                  ; Our app ID.
runtime=org.gnome.Platform/x86_64/3.32  ; The runtime it uses.
sdk=org.gnome.Sdk/x86_64/3.32           ; The sdk it uses.
command=fractal                         ; The command that our app will run

[Context]                               ; Our permissions are specified here
shared=network;ipc;                     ; These will be explained later
sockets=x11;wayland;pulseaudio;
filesystems=xdg-run/dconf;~/.config/dconf:ro;home;

```

---

## Metadata (cont.)

<div class="small"></div>

```ini
[Session Bus Policy]                 ; More permissions
ca.desrt.dconf=talk
org.freedesktop.secrets=talk
org.freedesktop.Notifications=talk

[Environment]                        ; Environment variables
DCONF_USER_CONFIG_DIR=.config/dconf

[Extension org.gnome.Fractal.Locale] ; Extensions (will be explained later)
directory=share/runtime/locale
autodelete=true
locale-subset=true
```

---

## Metadata (cont.)

<div class="small"></div>

```ini
[Extension org.gnome.Fractal.Debug]
directory=lib/debug
autodelete=true
no-autodownload=true
```

In summary: the metadata stores all the information we need about an application other
than its actual contents.

---

## The Filesystem Tree

- `/usr` - Read-only, contains the files from your runtime / sdk. Read-only.
- `/app` - Your app files will be stored here, it's used as a prefix like /usr
  e.g. `./configure --prefix=/app`. Once our app is built, this is read-only as well.
- `/app/extra` - Storage for "extra data", which allows us to download e.g. non-redistributable
  proprietary files on the user's systems and extract them.
- `/run`, `/tmp` - Entirely sandboxed and separate from the host filesystem.
- `XDG_DATA_HOME=$HOME/.var/app/my.app.Id/data` - Our XDG data storage directory (like
  `~/.local/share`). Can be accessed as `/var/data` instead.
- `XDG_CONFIG_HOME=$HOME/.var/app/my.app.Id/config` - XDG config directory (like `~/.config`).
  Can be accessed as `/var/config` instead.
- `XDG_CACHE_HOME=$HOME/.var/app/my.app.Id/cache` - XDG cache directory (like `~/.cache`).
  Can be accessed as `/var/cache` instead.

---

## Low-level building

*Now we get to building stuff...*

The `flatpak build*` commands cover the basics of building Flatpaks.

- `flatpak build-init DIRECTORY APPID SDK RUNTIME`: Initialize a build directory. This directory
  will contain our app's `/app`, as well as any files that should be exported to the host system
  (e.g. modified .desktop files, so we can run our apps from our DE's app menus).
- `flatpak build DIRECTORY COMMAND...`: Run a command inside the build directory.
  This essentially sets up a mini Flatpak run environment, except `/app` is writable!
  Use this to run stuff like `make && make install PREFIX=/app`, which will have make install
  our files to the build directory. The runtime used for build commands will be the SDK
  we gave above.
- `flatpak build-finish`: Finalize the build directory and write the metadata file. Anything
  you want to have written to your metadata will be passed as a command-line argument
  to `build-finish`.

---

## Passing metadata to `build-finish`

Permissions are explained much more thoroughly on
[the docs](http://docs.flatpak.org/en/latest/sandbox-permissions.html); this is just
an overview. Here are some of the arguments we'll be covering in some more detail:

- `--allow={devel,multiarch,...}`: Allow access to:
  - devel: syscalls like ptrace.
  - multiarch: Allows stuff written for other, compatible arches, e.g. x86 on x64 (will be
    more useful later).
- `--filesystem={...}`: Expose a filesystem into the sandbox.
- `--own-name=NAME`, `--talk-name=NAME`: Own or talk to the given D-Bus names, respectively.

---

## What filesystems can we use?

- Absolute paths: `--filesystem=/some/absolute/path`
- home: Shares `/home`. Can also use a child path, e.g. `--filesystem=home/some-directory`.
- host: Same as `filesystem=home`, but also shares several other host directories under
    `/run/host`.
- `xdg-{desktop,documents,download,music,pictures,videos,...}`: Shares the given XDG
  directory. Can also use a child path like `xdg-videos/abc`.
- Subdirectories of `xdg-run` (a.k.a. `/run/user/$UID`), e.g. `--filesystem=xdg-run/my-dir`.
  **You cannot share xdg-run itself, only child paths!**

---

## Portals

We should be able to access some aspects of the outside world on an as-needed basis, e.g.
you shouldn't need `--filesystem=home` to attach a file to a chat box. The concept of portals
takes care of this: they are D-Bus services that perform a set task on the host. See the
[xdg-desktop-portal docs](https://flatpak.github.io/xdg-desktop-portal/portal-docs.html) for
more info. They will automatically be used when needed by the default GUI libraries inside
the Flatpak runtimes (Flatpak'd GTK+ will automatically use the file chooser portal if
GtkFileChooserNative is used, xdg-open will use the OpenURI portal automatically, etc).

Some portals include:

- File chooser portal, for opening / saving single files.
- OpenURI portal, for opening generic URIs.
- Screenshot portal, for taking screenshots.

---

## Calling host or sandboxed commands

- Sometimes you need to run a command either in its own sandbox or on the host: use
  `flatpak-spawn`.
- Sandboxed command:
  - Add finish arg: `--talk-name=org.freedesktop.portal.Flatpak`
  - Run `flatpak-spawn --sandbox my-command`
- Host command:
  - Add finish arg: `--talk-name=org.freedesktop.Flatpak`
  - Run `flatpak-spawn --host my-command`

---

## Building something looks like...

<div class="small"></div>

```bash
$ flatpak build-init my-build com.my.App org.freedesktop.Sdk org.freedesktop.Platform
# The stuff that will end up in /app is inside my-build/files
$ mkdir -p my-build/files/bin
$ echo 'ls "$@"' > my-build/files/bin/my-app
# Now this command runs inside the environment, with stuff like /app set up
$ flatpak build my-build chmod +x /app/bin/my-app
# We can get a shell inside our build environment too
$ flatpak build my-build  # pass 'bash' to open bash instead of bash in posix mode
# Finish the build, write the metadata
$ flatpak build-finish --command=my-app --filesystem=home
```

---

## We built it...how do we use it?

[More info here!](http://docs.flatpak.org/en/latest/publishing.html) We're not going
to cover hosting our own repo...

- `flatpak build-export REPO DIRECTORY` - Exports the app inside our build directory
  into an OSTree repository at REPO, creating it if necessary.
- `flatpak build-bundle REPO BUNDLE APP` - Create a "bundle" from the repository, which
  is a standalone file that can be installed via `flatpak install my-bundle.flatpak`.
  *APP* is our app that we're creating a bundle for.
- `flatpak build-import-bundle REPO BUNDLE` - *Import* a bundle into our repository.

---

## Using our app looks like...

<div class="small"></div>

```bash
$ flatpak build-export my-repo my-build
Commit: 1e537ca869caf7845cf2ef906d475aa6856c7e8f3e315d8ddbbe6cbae8f229bc
Metadata Total: 11
Metadata Written: 6
Content Total: 2
Content Written: 2
Content Bytes Written: 165 (165 bytes)
$ flatpak build-bundle my-repo com.my.App.flatpak com.my.App
$ flatpak install com.my.App.flatpak
$ flatpak run com.my.App
```

---

## `flatpak run` can do magic

<div class="small"></div>

```bash
# BAD
$ flatpak run com.my.App /usr/lib64/rpm-ostree
# BAD
$ flatpak run --filesystem=host com.my.App /usr/lib64/rpm-ostree
# GOOD
$ flatpak run --filesystem=host com.my.App /run/host/usr/lib64/rpm-ostree
# INTERESTING: opens a shell inside
$ flatpak run --command=bash com.my.App
# INTERESTING: runs my app in development mode
# (passes --allow=devel and uses the sdk as the runtime)
$ flatpak run -d --command=bash com.my.App
```

---

## flatpak-builder: high-level building

```bash
$ flatpak-builder --help
Usage:
  flatpak-builder [OPTION…] DIRECTORY MANIFEST - Build manifest
...
```

flatpak-builder automates the above workflow, using a *manifest* file (in either JSON or
YAML) containing what exactly we want to build and how it should be built.

[The documentation covers flatpak-builder!](http://docs.flatpak.org/en/latest/building.html)

---

## flatpak-builder: Manifest files (in YAML syntax)

[Reference docs.](http://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html#flatpak-manifest)

<div class="small"></div>

```yaml
app-id: com.my.App                 # Our app's ID goes here
runtime: org.freedesktop.Platform  # The runtime our app will use
runtime-version: '18.08'           # The branch of said runtime
sdk: org.freedesktop.Sdk           # The SDK used for building
finish-args:                       # e.g. permissions go here to pass to build-finish
  - '--filesystem=home'
modules:                           # Our build steps will go here...
  ...
```

---

## flatpak-builder: Manifest modules

Modules are how flatpak-builder logically separates build steps.

<div class="small"></div>

```yaml
modules:
  - name: my-app
    buildsystem: simple
    build-commands:
      - 'install -Dm 755 my-app /app/bin/my-app'
    sources:
      - type: script
        dest-filename: my-app
        commands:
          - 'ls "$@"'
```

---

## flatpak-builder: Manifest build systems

The value of buildsystem determines how the application will be built. Usually
`configure && build && install`.

- *simple*: No build magic.
- *autotools*: autotools build system (`./configure && make && make install`)
  - Will automatically run autogen / autogen.sh if configure script doesn't exist
- *cmake*: CMake build system (`cmake ... && make && make install`)
- *cmake-ninja*: Above, but with Ninja (`cmake ... && ninja && ninja install`)
- *meson*: Meson build system (`meson ... && ninja && ninja install`)
- *qmake*: QMake build system (`qmake ... && make && make install`)

---

## flatpak-builder: Manifest build options

See the [reference docs](http://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html#flatpak-manifest) for more options.

- `build-commands`: A set of commands to run during the build, between the build and install
  steps. For `buildsystem: simple`, this is all that will be run.
- `config-opts`, `make-args`, `make-install-args`: Arguments to pass to the configure, build,
  and install steps, respectively.
- `rm-configure`: For autotools, always delete the configure script, causing autogen to be
  re-run.
- `post-install`: List of commands to run after install completes.

---

## flatpak-builder: Manifest build options (cont)

- `build-options`: Some miscellaneous build options, can also be set at the top level
  - `cflags, cflags-override, cppflags, cppflags-override, ldflags, ldflags-override`:
    Set the C flags, C++ compiler flags, and linker flags. If the -override variant is used,
    any flags inherited from the top-level build-options will be cleared.
  - `prefix`: Set the install prefix (done automatically by default).
  - `append-path, prepend-path, append-ld-library-path, prepend-ld-library-path`,
    `append-pkg-config-path, prepend-pkg-config-path`:
    Append/prepend to the given paths (build time only).
  - `env`: A mapping of environment variables.
  - Can also pass `config-opts, make-args, make-install-args` here.

---

## flatpak-builder: Manifest build options (example)

<div class="small"></div>

```yaml
buildsystem: cmake-ninja
config-opts:
  - '-DBUILD_STATIC=FALSE'
post-install:
  - 'touch /app/installed'  # or whatever
build-options:
  cflags: '-DMODERN_SYSTEM'
  append-path: '/app/something'
env:
  MY_ENV_VAR: '12345'
```

---

## flatpak-builder: Manifest sources

Again, reference docs for more info.

Possible source types:

- `archive`: Archive sources, will automatically be extracted.
- `git`, `bzr`, `svn`: Git / bazaar / subversion repos.
- `dir` / `file`: Path to a local directory / local or remote file.
- `script`: Create a script containing the given commands.
- `shell`: Run some shell commands.
- `patch`: Automatically apply some patches.
- `extra-data`: Download some data on the user's system to avoid licensing issues.

---

## flatpak-builder: Manifest sources (basic options)

- `only-arches`, `skip-arches`: Only add this source / skip this source for the architectures in
  the list.
- `dest`: The destination directory the source will go into.

For any sources that are remote files, you *must* pass a checksum using the sha256 or
sha512 options as well.

```yaml
- type: whatever
  # ...
  only-arches: [x86_64]
  dest: my-dest-dir
```

---

## flatpak-builder: Manifest sources (archive)

archive sources download an archive file (tar, zip, rpm) and extract it.

- `path`, `url`: A local / remote path to the archive to download.
- `strip-components`: Strip this many components from the paths of extracted files.
  Defaults to 1 (e.g. `my-app-0.1/x/y.z` will be extracted as `x/y.z`).
- `dest-filename`: Destination name for the downloaded file. Default is the URL's
  basename.

<div class="small"></div>

```yaml
- type: archive
  url: https://my-project.org/releases/my-project-0.2.tar.gz
  sha256: 0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff
  # dest-filename default is 'my-project-0.2.tar.gz'
```

---

## flatpak-builder: Manifest sources (Git)

- `path`, `url`: A local / remote path to the Git repository.
- `branch`, `tag`, `commit`: Specify a specific item to check out. (You can give branch or tag
  with commit, in which case it'll ensure it points to the given commit.)
- `disable-shallow-clone`: Shallow clones are the default, this changes it.

<div class="small"></div>

```yaml
- type: git
  url: https://github.com/my-org/my-project
  tag: v0.3.2
```

---

## flatpak-builder: Manifest sources (dir / file)

- `path`, `url`: A local / remote path to the file / directory. (`url` is file-only.)
- `dest-filename` (file only): Destination path for the file.
- `skip` (dir only): Files in the directory to ignore.
- `dest`: Already mention in the common options section, but for directories, this will
  set the target name of the copied directory.

<div class="small"></div>

```yaml
- type: file
  url: https://my-project.org/example.conf
  dest-filename: project-example.conf
  sha256: 0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff
- type: dir
  path: ../src
  dest: my-src  # dest will be explained later
```

---

## flatpak-builder: Manifest sources (script / shell)

- `commands`: List of commands to run (for shell) or be saved into the script (for script).
- `dest-filename` (script only): Destination file name, default is `autogen.sh`.

<div class="small"></div>

```yaml
# Will save my-script.sh containing a hashbang plus the given commands
- type: script
  commands:
    - 'echo 123'
  dest-filename: my-script.sh
- type: shell
  commands:
    - 'cp my-script.sh my-other-script.sh'
```

---

## flatpak-builder: Manifest sources (patch)

- `path` / `paths`: The patch file / list of patch files to apply.
- `strip-components`: The `-p` argument to patch, # of components to strip from filenames in
  the patch file (default is 1).
- `use-git`, `use-git-am`: `git apply` / `git am` instead of using `patch` (for binary patches).

<div class="small"></div>

```yaml
- type: patch
  path: my-file.patch
  options:
    - '--ignore-whitespace'
```

---

## flatpak-builder: Manifest sources (extra-data)

- extra-data is a system to allow building Flatpaks for proprietary applications with
  no-redistribution clauses in their licenses (e.g. official VS Code, Gravit Designer).
- Any sources in extra-data will be downloaded when the Flatpak is installed in the
  user's system, rather than at build time.
- Flatpak will save it into `/app/extra`, then look for and run a script named
  `apply_extra` that is responsible for extracting / manipulating the extra-data file as
  needed to run the application.
- Options:
  - `url`: A URL to the extra-data file to download.
  - `filename`: The downloaded name of the extra-data file.
  - `size`: The size (in bytes) of the file that will be downloaded.

---

## flatpak-builder: Manifest sources (extra-data ex.)

<div class="small"></div>

```yaml
- type: extra-data
  filename: my-file.zip
  url: https://pro.my-project.org/codecs/my-file.zip
  sha256: 0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff
  size: 12349
- type: script
  dest-filename: apply_extra
  commands:
    - 'unzip my-file.zip'
    - 'mv my-file-0.1/{my-binary,some-data} .'
    - 'rm -rf my-file.zip my-file-0.1'
```

---

## flatpak-builder: Cleanup

Any patterns in the `cleanup` key will be deleted from the final build:

- Paths beginning with a `/` are relative to the prefix (e.g. `/share` means `/app/share`).
- Other paths are filenames that will be deleted no matter where they're located.

```yaml
app-id: com.my.App
# ...
cleanup:
  - '/bin/something-only-needed-for-building'
  - '/include'
  - '*.pc'
```

---

## flatpak-builder: Module / source paths

You can store your modules and sources in different files.

<div class="small"></div>

```yaml
# com.my.App.yaml:
# ...
modules:
  - some-dir/my-module.yaml
# some-dir/my-module.yaml:
name: my-module
sources:
  - my-source.yaml
# my-source.yaml
type: archive
url: ...
```

---

## flatpak-builder: Shared modules

There is a collection of commonly-used module files at
[the flathub/shared-modules repository](https://github.com/flathub/shared-modules) that you
can use as a Git submodule, including:

- SDL
- gtk2
- libappindicator
- A stub udev

<div class="small"></div>

```yaml
modules:
  - shared-modules/gtk2/gtk2.json
  # ...
```

---

## flatpak-builder-tools

flatpak-builder doesn't give the builds any network access, which causes some difficulty for
building some applications that use package managers that assume network access (e.g.
Python's pip, Ruby's gem).
[flatpak-builder-tools](https://github.com/flatpak/flatpak-builder-tools) provides several
scripts that take in packages or lockfiles and output either module files or source files.

- `flatpak-dotnet-generator.py output-sources.json my-project.csproj`
- `flatpak-npm-generator.py package-lock.json [-o output-sources.json]`
- `flatpak-yarn-generator.py yarn.lock [-o output-sources.json]`
- `flatpak_rubygems_generator.rb [-o output-module.json]`
- `flatpak-pip-generator package1 package2 --output output-module.json`
- `flatpak-poetry-generator.py lockfile [-o output-sources.json]`
- `flatpak-cargo-generator.py Cargo.lock [-o output-sources.json]`

---

## The metadata trio: XDG desktop, appstream, icons

In order for a desktop app to display properly, three things need to be available:

- `.desktop`: An XDG desktop file (placed in `/app/share/applications`),
  for displaying the app in your DE's launcher.
- `.appdata.xml`: An appstream file (placed in `/app/share/metainfo` or, legacy location,
  `/app/share/appdata`) for displaying information about your app in Flathub and
  Flatpak software stores.
- App icons, under `/app/share/icons`.

In addition, the names for the desktop file, appstream file, and icons must match the app ID.
Given `com.my.App`, `my-app.desktop`, `my-app.appdata.xml`, and `my-app.svg` will all be
rejected in favor of `com.my.App.desktop`, `com.my.App.appdata.xml`, etc.

---

## Modifying application metadata files

These all go in the top-level part of your manifest.

- `rename-desktop-file`: Any desktop files with this filename will be renamed to
  `app-id.desktop`.
- `rename-appdata-file`: Same as above, but for appdata files.
- `rename-icon`: Same as above, however whereas the others expect a full filename including
  extension, `rename-icon` expects a filename *without* an extension.
- `copy-icon`: If true, instead of `rename-icon` renaming the icon, it will copy it.

`desktop-file-edit` can also be used to modify the contents of a .desktop file.

<div class="small"></div>

```yaml
rename-desktop-file: my-app.desktop
rename-appdata-file: my-app.appdata.xml
rename-icon: my-app
```

---

## Base apps

Sometimes, multiple apps will depend on a common "base" of extra modules that aren't in
the runtimes. Therefore, a base app can be created, which is basically just a normal app,
except...there's no app inside.

Any apps that want to use the modules contained within this base app can use it:

<div class="small"></div>

```yaml
app-id: com.my.electron.App
# ...
# Anything inside org.electronjs.Electron2.BaseApp will be available inside our app
# (e.g. libappindicator, libnotify)
base: org.electronjs.Electron2.BaseApp
```

---

## Extensions

Apps often need to be extensible in some way, which doesn't work with the Flatpak model we
know of. However, Flatpak handles this by adding support for *extensions*.

Extensions can be used for several different tasks:

- Extending the default SDKs with some extra tools.
- Adding reusable functionality that can be added to different apps.
- Adding support for a plugin system in your Flatpaks.

---

## flatpak-builder: Extensions

Extensions are primarily added to the `add-extensions` mapping; the map's key is the extension
ID, which will be automatically downloaded if necessary (this behavior can be customized).
`add-build-extensions` is also available, for adding extensions that are available during
build time.
See `man flatpak-metadata` or
[the docs](http://docs.flatpak.org/en/latest/flatpak-command-reference.html#flatpak-metadata)
for more info on the keys.

- `directory`: The directory where the extension will be mounted, relative to /app (or /usr
  for runtimes). **If this directory is not created as part of your build steps, the
  extension simply won't be mounted.**
- `version` / `versions`: The extension's version(s) / branch(es) to use (think runtime-version).
  Default is the app's own branch.
- `add-ld-path`: Path relative to `directory` that will be added to LD_LIBRARY_PATH.
- `no-autodownload`: Don't automatically download an extension like usual.
- `autoremove`: Automatically delete the extension if its parent.
- `remove-after-build`: For `add-build-extensions`, remove this once the build finishes.

You can see the extensions an app has via `flatpak info -e com.my.App` (or `flatpak info -m`,
since extensions are stored in the metadata).

---

## flatpak-builder: Basic extension example

<div class="small"></div>

```yaml
app-id: com.my.App
# ...
add-extensions:
  # Mounts the contents of the com.my.App.Ext//1 extension at /app/lib/ext.
  # (/app/lib/ext/lib will also be added to LD_LIBRARY_PATH)
  com.my.App.Ext:
    directory: lib/ext
    add-ld-path: lib
    version: '1'
    autoremove: true
# ...
```

---

## flatpak-builder: Basic extension example (cont.)

<div class="small"></div>

```yaml
# ...
modules:
  - name: setup-extension
    buildsystem: simple
    build-commands:
      - 'mkdir -p /app/lib/ext'
```

---

## flatpak-builder: Extensions for runtimes

- Runtimes have extensions too; these can be used to add some extra data not normally present.
  The freedesktop platform and SDK define several extensions that you may find of use.
- `org.freedesktop.Platform.Compat.i386/x86_64/18.08`, when combined with
  the permission `--allow=devel`, will allow your app to use 32-bit binaries (the extension
  itself contains the 32-bit libraries).
- `org.freedesktop.Sdk.Debug`, is automatically mounted if installed (because it's inside the
  Sdk's metadata) and adds debug symbols.

---

## flatpak-builder: i386 extension example

<div class="small"></div>

```yaml
add-extensions:
  org.freedesktop.Platform.Compat.i386:
    directory: lib/i386-linux-gnu
    version: '18.08'
  org.freedesktop.Platform.Compat.i386.Debug:
    directory: lib/debug/lib/i386-linux-gnu
    version: '18.08'
    no-autodownload: true  # Don't autodownload big debug symbols
modules:
  - name: setup-compat
    buildsystem: simple
    build-commands:
      - 'mkdir -p /app/lib{,/debug/lib}/i386-linux-gnu'
```

---

## flatpak-builder: Extensions for plugins

In our basic example, only one extension could be mounted at once...not ideal for a plugin
system. Some more extension options:

- `subdirectories`: If true, and an extension with the exact name isn't installed, then
  Flatpak will find all installed items that *start* with the extension name, and mount
  then as subdirectories of the mount directory.
- `subdirectory-suffix`: Mount each extension to a suffix of the subdirectory instead of the
  subdirectory itself.
- `merge-dirs`: Merge any subdirectories under the given path.

`subdirectories` is what primarily allows for a plugin system.

---

## flatpak-builder: Plugin extension example

<div class="small"></div>

```yaml
add-extensions:
  com.my.App.Plugin:
    # com.my.App.Plugin.demo//1 -> mounted to /app/lib/plugins/demo
    # com.my.App.Plugin.qux//1 -> mounted to /app/lib/plugins/qux
    directory: lib/plugins
    add-ld-path: true
    subdirectories: true
    no-autodownload: true
    autodelete: true
    version: '1'
    # If this were set, then:
    # com.my.App.Plugin.demo//1 -> mounted to /app/lib/plugins/demo/plugin-data
    # com.my.App.Plugin.qux//1 -> mounted to /app/lib/plugins/qux/plugin-data
    # subdirectory-suffix: plugin-data
```

---

## flatpak-builder: Plugin extension example 2

<div class="small"></div>

```yaml
add-extensions:
  com.my.App.Plugin:
    directory: lib/plugins
    add-ld-path: true
    subdirectories: true
    no-autodownload: true
    autodelete: true
    version: '1'
    # Now, /app/lib/plugins/demo/data and /app/lib/plugins/qux/data will be
    # merged as /app/lib/plugins/data.
    merge-dirs: data
```

---

## Creating extensions

<div class="small"></div>

```yaml
app-id: com.my.App.Plugin.demo
branch: '1'
# We use the app as our runtime
runtime: com.my.App
runtime-version: '1'
sdk: org.freedesktop.Sdk//18.08  # yes, we can specify a custom branch for the sdk
# These are explained later
separate-locales: false
appstream-compose: false
```

---

## Creating extensions (cont.)

<div class="small"></div>

```yaml
modules:
  # Everything should be installed to $FLATPAK_DEST, which is automatically
  # set to needed destination path. We also need to compose the appstream manually.
  - name: my-module
    buildsystem: simple
    build-commands:
      - 'install -Dm 644 com.my.App.Plugin.demo.metainfo.xml
         ${FLATPAK_DEST}/share/metainfo/com.my.App.Plugin.demo.metainfo.xml'
      - 'appstream-compose --basename=com.my.App.Plugin.demo
         --prefix=${FLATPAK_DEST} --origin=flatpak com.my.App.Plugin.demo'
```

---

## Basics of SDK extensions

`org.freedesktop.Sdk` defines an subdirectory extension `org.freedesktop.Sdk.Extension`,
which mounts any extensions with this prefix as subdirectories of `/usr/lib/sdk`. Any apps
using the SDK as their runtime will also have access to these. As a common
pattern, many of these will also have some useful scripts in their root:

- `enable.sh` or `use.sh`: Updates your environment variables (e.g. PATH) to use the extension.
- `install*.sh`: Copy the extension to `/app`; it may be split between multiple scripts
  to separate copying the runtime files from the full SDK extension.

<div class="small"></div>

```
$ flatpak run org.freedesktop.Sdk//18.08
[📦 org.freedesktop.Sdk ~]$ ls /usr/lib/sdk
dotnet	golang	mono5  openjdk10  openjdk8
[📦 org.freedesktop.Sdk ~]$ ls /usr/lib/sdk/dotnet/
bin  enable.sh	install-sdk.sh	install.sh  lib  manifest.json	share
[📦 org.freedesktop.Sdk ~]$
```

---

## flatpak-builder: SDK extensions

SDK extensions can be used during the build process via the sdk-extensions option:

<div class="small"></div>

```yaml
sdk-extensions:
  - org.freedesktop.Sdk.Extension.dotnet
modules:
  - name: something
    buildsystem: simple
    build-commands:
      - '. /usr/lib/sdk/dotnet/enable.sh; dotnet publish ...'
  - name: dotnet-runtime
    buildsystem: simple
    build-commands:
      - '/usr/lib/sdk/dotnet/install.sh'
```

---

## flatpak-builder: Other useful top-level options

<div class="small"></div>

```yaml
# By default, locales will be separated into a separate extension.
# If your app has no locale information, set this to false.
separate-locales: true
# Skips the step of composing appstream metadata, this will generally be true
# for extensions who have to compose it manually.
appstream-compose: false
# Add some tags to the app
tags:
  - proprietary
# Prefix the app's Name in the XDG desktop file with this prefix
# Useful for e.g. automated nightly builds
desktop-file-name-prefix: '(Nightly) '
```

---

# Some example Flatpaks

### Check out [Flathub](https://github.com/flathub)

---

## Getting involved

- Try making some Flatpaks and
  [submitting them to Flathub](https://github.com/flathub/flathub/blob/master/CONTRIBUTING.md).
- Make your apps with Flatpak and sandboxing in mind.
  - GNOME Builder makes it easy to use Flatpak as your development environment.
- Docs are great!
- Spread the word!

---

# Thanks for watching!
