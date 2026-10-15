(function(){
  "use strict";
  const KEY="x4kiss-user-account";
  const DEFAULT={profile:{name:"",email:""},favorites:[],history:[],settings:{autoplay:false},security:{}};
  function read(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(DEFAULT)}catch{return structuredClone(DEFAULT)}}
  function write(state){localStorage.setItem(KEY,JSON.stringify(state));return state}
  function ensure(){const s=read();write(s);return s}
  window.X4KissAccount={version:"1.0.0",ready:true,read,write,ensure,storageKey:KEY};
  document.documentElement.dataset.x4kissAccount="ready";
})();
