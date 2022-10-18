init
```
$ source init-env-nodejs18.sh 
$ npm install @google/clasp 
$ ./node_modules/.bin/clasp
$ ./node_modules/.bin/clasp login
Logging in globally…
🔑 Authorize clasp by visiting this url:
https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=http..............

(node:128738) ExperimentalWarning: The Fetch API is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Authorization successful.

Default credentials saved to: /home/user/.clasprc.json.
```




setup a project
```
$ mkdir clasp_codelab;
$ cd clasp_codelab;
$ ../node_modules/.bin/clasp create --title "Clasp Codelab";
? Create which script? standalone
⠋ Creating new script: Clasp Codelab…(node:129599) ExperimentalWarning: The Fetch API is an experimental feature. This feature could change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Created new standalone script: https://script.google.com/d/1Uz6YuAgN-WoTtKKceL-kIlZiskimZUeD9bUAaH52OzkgJGWs9-5bUplJ/edit
Warning: files in subfolder are not accounted for unless you set a '/home/user/google/clasp_codelab/.claspignore' file.
Cloned 1 file.
└─ /home/user/google/clasp_codelab/appsscript.json


```

