# ColabNote

ColablNote is a minimalistic collaborative markdown text editor. It also supports LaTeX equation enclosed with $ (inline equation) or with $$ (block equation).

## Install Mongodb

Install nodejs, npm and mongodb. On Ubuntu/Debian this can be done with:

```bash
sudo apt-get install nodejs npm mongodb
```

You might also enable `smallfiles` by adding the following to `/etc/mongodb.conf`

```
smallfiles = true
```

## Install ColabNote

Issue the following commands:

```bash
git clone git@github.com:Alexander-Barth/CollabNote.git
cd CollabNote
npm install
```

Run ColabNote with the following command:

```
nodejs server.js
```

Open the address http://localhost:8000/ with your web-browser.

A document can be shared by sending its URL.
