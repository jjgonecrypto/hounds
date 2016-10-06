#hounds

![](https://media.giphy.com/media/TVCqfX7rLyMuY/giphy.gif)

A utility to smoke test a site by releasing hounds to follow all internal links and log any console errors.

##Usage

`npm i hounds`

```javascript
const hounds = require('hounds')()

hounds.release().then(errors => {
    // errors -> list of console warnings and errors 
    hounds.end()
})
```

