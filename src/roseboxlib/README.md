# roseboxlib

a library that contains:
- lib.js - my universal js utils
- roseboxlib.css - rosebox style css

# content below likely outdated!

# usage
## web development / any general enviroment
lib.js: ``https://kraxen72.github.io/roseboxlib/lib.js``  
roseboxlib.css ``https://kraxen72.github.io/roseboxlib/roseboxlib.css``  
  
**importing**
  
import js: ``<script type="text/javascript" src="https://kraxen72.github.io/roseboxlib/lib.js"></script>``    
import css in html: ``<link href="https://kraxen72.github.io/roseboxlib/roseboxlib.css" rel="stylesheet">``  
import css in css: ``@import url('https://kraxen72.github.io/roseboxlib/roseboxlib.css');``  

## using nodejs
this repo is a fully functional npm package so you can just ``yarn add https://github.com/KraXen72/roseboxlib.git --save`` or ``npm i https://github.com/KraXen72/roseboxlib.git --save-dev``  
  
then just import the files from ``./node_modules/roseboxlib`` depending on your enviroment  
example: electron  
``import * as utils from './node_modules/roseboxlib/lib.js'``