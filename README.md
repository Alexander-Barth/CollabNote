# CollabNote

CollabNote is a minimalistic collaborative markdown text editor. It also supports LaTeX equation enclosed with $ (inline equation) or with $$ (block equation).

## Install Mongodb

Install nodejs, npm and mongodb. On Ubuntu/Debian this can be done with:

```bash
sudo apt-get install nodejs npm mongodb
```

You might also enable `smallfiles` by adding the following to `/etc/mongodb.conf`

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

Run CollabNote with the following command:

```
nodejs server.js
```

Open the address http://localhost:8000/ with your web-browser.

A document can be shared by sending its URL.


## Install on OpenShift

```
rhc create-app CollabNote nodejs-0.10 mongodb-2.4 --from-code=https://github.com/Alexander-Barth/CollabNote.git
```
