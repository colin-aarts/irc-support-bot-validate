// Generated by LiveScript 1.5.0
(function(){
  'use strict';
  var util, exec, shorten, js, w3cCss, uriRegex, markupFragmentTpl, dataUriTpl, validate;
  util = require('util');
  exec = require('child_process').exec;
  shorten = require('goo.gl');
  js = require('js-extensions');
  w3cCss = require('w3c-css');
  uriRegex = /https?:\/\/\S+/;
  markupFragmentTpl = "<!DOCTYPE html><html><head><title>Test</title></head><body>{{fragment}}</body></html>";
  dataUriTpl = "data:text/html;charset=utf-8,{{doc}}";
  module.exports = function(){
    var this$ = this;
    return this.register_special_command({
      name: 'v',
      description: 'Check a resource with the W3C markup and CSS validators.',
      admin_only: false,
      fn: function(event, inputData, outputData){
        var opts, uri, uriTruncated, isFragment, doc;
        opts = this$.botOptions.pluginOptions['irc-support-bot-validate'];
        if (inputData.args) {
          uri = inputData.args;
        } else if (outputData.recipient[0] === '#' && this$.backlog[outputData.recipient]) {
          uri = (function(){
            var i$, ref$, len$, message, uriMatch;
            for (i$ = 0, len$ = (ref$ = this.backlog[outputData.recipient]).length; i$ < len$; ++i$) {
              message = ref$[i$];
              uriMatch = message.match(/https?:\/\/\S+/);
              if (uriMatch) {
                return uriMatch[0];
              }
            }
          }.call(this$));
        } else {
          return;
        }
        if (!uri) {
          return;
        }
        uriTruncated = js.str_truncate(uri, 20, 10, '…');
        if (!uri.match(uriRegex)) {
          isFragment = true;
          doc = markupFragmentTpl.replace('{{fragment}}', uri);
          uri = dataUriTpl.replace('{{doc}}', doc);
        }
        validate('markup', uri, function(err, result){
          return function(_){
            var full;
            full = "http://validator.nu/?doc=" + encodeURIComponent(uri);
            return shorten(full, opts.googleApiKey, function(err, result){
              var short;
              if (!err) {
                short = result.id;
              }
              return _(short || full);
            });
          }(function(resultUri){
            var message, messageTypes, resultType, resultEncoding, i$, ref$, len$, msg;
            if (err) {
              message = "(markup) oops, something went wrong trying to validate the document at « " + uriTruncated + " » • validation result: " + resultUri;
            } else {
              result = JSON.parse(result);
              messageTypes = {
                'info': 0,
                'error': 0,
                'non-document-error': 0,
                'warning': 0
              };
              if (result.source) {
                resultType = result.source.type ? " • type: " + result.source.type : '';
                resultEncoding = result.source.encoding ? " • encoding: " + result.source.encoding : '';
              }
              if (!result.messages.length) {
                message = "(markup) it appears the document at « " + uriTruncated + " » is valid and has no issues!" + resultType + resultEncoding + " • validation result: " + resultUri;
              } else {
                for (i$ = 0, len$ = (ref$ = result.messages).length; i$ < len$; ++i$) {
                  msg = ref$[i$];
                  messageTypes[msg.type]++;
                  if (msg.type === 'info' && msg.subType === 'warning') {
                    messageTypes.warning++;
                  }
                }
                if (messageTypes['non-document-error']) {
                  message = "(markup) could not check the document at « " + uriTruncated + " »" + resultType + resultEncoding + " • validation result: " + resultUri;
                } else {
                  message = "(markup) « " + uriTruncated + " » errors: " + messageTypes.error + " • warnings: " + messageTypes.warning + resultType + resultEncoding + " • validation result: " + resultUri;
                }
              }
            }
            if (message) {
              return this$.send(outputData.method, outputData.recipient, message);
            }
          });
        });
        if (!isFragment) {
          return w3cCss.validate(uri, function(err, result){
            return function(_){
              var full;
              full = "http://jigsaw.w3.org/css-validator/validator?uri=" + encodeURIComponent(uri) + "&profile=css3";
              return shorten(full, opts.googleApiKey, function(err, result){
                var short;
                if (!err) {
                  short = result.id;
                }
                return _(short || full);
              });
            }(function(resultUri){
              var message;
              if (err) {
                message = "(css) oops, something went wrong trying to validate the document at « " + uriTruncated + " » • validation result: " + resultUri;
              } else {
                if (!result.errors.length && !result.warnings.length) {
                  message = "(css) it appears the document at « " + uriTruncated + " » is valid and has no issues! • validation result: " + resultUri;
                } else {
                  message = "(css) « " + uriTruncated + " » • errors: " + result.errors.length + " • warnings: " + result.warnings.length + " • profile: css3 • validation result: " + resultUri;
                }
              }
              if (message) {
                return this$.send(outputData.method, outputData.recipient, message);
              }
            });
          });
        }
      }
    });
  };
  validate = function(which, uri, cb){
    var result, hostname, path, conf, qs, curl, this$ = this;
    result = [];
    hostname = (function(){
      switch (which) {
      case 'markup':
        return 'checker.html5.org';
      case 'css':
        return 'jigsaw.w3.org';
      }
    }());
    path = (function(){
      switch (which) {
      case 'markup':
        return "/";
      }
    }());
    conf = {
      hostname: hostname,
      path: path,
      method: 'get'
    };
    qs = {
      doc: uri,
      showsource: 'yes',
      out: 'json'
    };
    return curl = exec("curl \"https://" + hostname + path + "?doc=" + encodeURIComponent(qs.doc) + "&out=" + qs.out + "&showsource=" + qs.showsource + "\" ", function(err, result, stderr){
      if (err) {
        return cb(stderr, null);
      } else {
        return cb(null, result);
      }
    });
  };
}).call(this);
