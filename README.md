[![Build Status](https://travis-ci.org/unimonkiez/icon-maker-loader.svg?branch=master)](https://travis-ci.org/unimonkiez/icon-maker-loader)
# Icon maker loader
##### Webpack loader to load svgs to font files and return the css classes to use that icon.
## Installation
* `npm install icon-maker-loader`
* if you dont have a css and fonts (eot,svg,ttf,woff) loader, you can use `css-loader` and `url-loader`.

## Usage
### webpack configuration
```javascript
const path = require('path');

module.exports = {
  ...
  module: {
    loaders: [
      {
        test: /\.svg$/,
        loader: 'icon-maker',
        include: path.join(__dirname, 'icons') // To avoid clash of svgs
      }, {
        test: /\.css$/, // Have to configure css loader for the generated css
        loader: 'css'
      }, {
        test: /\.(woff|eot|ttf|svg)$/, // Have to configure fonts loaders for the generated fonts
        loader: 'url',
        exclude: path.join(__dirname, 'icons') // To avoid clash of svgs
      }
    ]
  }
};

```
### js example (react)
```javascript
import React, { Component } from 'react';
import yinYan from './icons/yin-yan.svg'; // You get classes `default default-yin-yan`

export default MyComponent extends Component {
  render() {
    return (
      <div>
        Look at my icon!
        <span className={yinYan} />
      </div>
    );
  }
}
```
### html example (requires [html-loader](https://github.com/webpack/html-loader))
```html
<div>
  Look at my icon!
  <span class="${require('./icons/yin-yan.svg')}">
  </span>
</div>
```
## parameters (query params to the loader)
* `fontFamily` - (default `icon-maker`), can split your icons to multiple font families (for instance, better loading for different pages of your application).
* `files` - (default `eot,svg,ttf,woff`), can decide which font files will be generated.
* `localCss` - (default `false`) - will generate css with [local scope](https://github.com/webpack/css-loader#local-scope) to be used with css-loader (you can also convert all of your classes to local using `css-loader?modules` and then this option is not needed).

### Example of parameters
`icon-maker?fontFamily=login&files=eot,svg&localCss`
