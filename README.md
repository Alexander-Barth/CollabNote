# CollabNote

CollabNote is a minimalistic collaborative markdown text editor. It also supports LaTeX equation enclosed with $ (inline equation) or with $$ (block equation).
A demo is available at http://collabnote-oceanbrowser.rhcloud.com/.

## Install dependencies

Install nodejs, npm, git and mongodb. On Ubuntu/Debian, this can be done with:

```bash
sudo apt-get install nodejs npm mongodb git-core
```

To save disk space, you might also want to enable `smallfiles` by adding the following to `/etc/mongodb.conf`

```
smallfiles = true
```

## Install CollabNote

Issue the following commands:

```bash
git clone git@github.com:Alexander-Barth/CollabNote.git
cd CollabNote
npm install
```

## Run CollabNote

Run CollabNote with the following command:

```bash
nodejs server.js
```

Open the address http://localhost:8000/ with your web-browser.

A document can be shared by sending its URL.


## Install on OpenShift

Register at https://www.openshift.com/ and follow the instructions at https://developers.openshift.com/getting-started/ to setup the `rhc` command-line tool. Deploying CollabNote can be done with the following command:

```bash
rhc create-app CollabNote nodejs-0.10 mongodb-2.4 --from-code=https://github.com/Alexander-Barth/CollabNote.git
```
