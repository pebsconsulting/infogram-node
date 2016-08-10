var url = require('url');
var crypto = require('crypto');
var _ = require('underscore');
var superagent = require('superagent');

function InfogramApi (apiKey, apiSecret) {
  this.base = url.parse('https://infogr.am/service/v1');
  if (!apiKey || !apiSecret) {
    throw new Error('Please provide two arguments: apiKey and apiSecret');
  }
  this.apiKey = apiKey;
  this.apiSecret = apiSecret;
}

InfogramApi.prototype = {
  get: function (path, params) {
    var method = superagent.get;
    return this.call(method, path, params);
  },

  post: function (path, params) {
    var method = superagent.post;
    params['content'] = JSON.stringify(params['content']);
    return this.call(method, path, params);
  },

  put: function (path, params) {
    var method = superagent.put;
    params['content'] = JSON.stringify(params['content']);
    return this.call(method, path, params);
  },

  delete: function (path, params) {
    var method = superagent.delete;
    return this.call(method, path, params);
  },

  call: function (method, path, params) {
    var basePath = this.base.pathname;
    if (_.last(basePath) !== '/' && _.last(path) !== '/') {
      basePath += '/';
    }

    var req = method('https://' + this.base.hostname + basePath + path);

    var requestParams = _.extend(_.clone(params), {
      api_key: this.apiKey
    });

    var requestOptions = {
      hostname: this.base.hostname,
      port: this.base.port,
      path: basePath + path,
      method: req.method
    };

    var baseString = signatureBaseString.call(this, requestOptions, requestParams);

    var signingKey = percentEncode(this.apiSecret);

    return new Promise(function (resolve, reject) {
      var hmac = crypto.createHmac('sha1', signingKey);
      hmac.end(baseString, 'UTF-8', function makeRequest (error) {
        if (error) {
          reject(error);
          return;
        }

        requestParams['api_sig'] = hmac.read().toString('base64');

        if (req.method === 'GET' || req.method === 'DELETE') {
          req.send(requestParams);
        } else {
          req.type('form');
          req.send(requestParams);
        }

        if (requestParams.query) {
          req.query(requestParams.query);
        }

        if (requestParams.headers) {
          req.set(requestParams.headers);
        }

        req.end(function (err, response) {
          if (err) {
            reject(err);
          } else {
            resolve(response.body);
          }
        });
      });
    });
  }
};

InfogramApi._addMethods = function (methods) {
  for (var i in methods) {
    if (methods.hasOwnProperty(i)) {
      this.prototype[i] = methods[i];
    }
  }
};

function signatureBaseString (requestOptions, params) {
  var components = [];
  components.push(requestOptions.method);

  var host = requestOptions.hostname;
  if (requestOptions.port) {
    host += ':' + requestOptions.port;
  }

  components.push(percentEncode(this.base.protocol + '//' + host + requestOptions.path));

  components.push(percentEncode(buildQueryString(params)));

  return components.join('&');
}

function percentEncode (input) {
  return encodeURIComponent(input).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

function buildQueryString (params) {
  var query = '';
  var first = true;
  var keys = _.keys(params);

  keys.sort();
  _.each(keys, function (key) {
    if (!first) {
      query += '&';
    }
    query += percentEncode(key) + '=' + percentEncode(params[key]);
    first = false;
  });

  return query;
}

module.exports = InfogramApi;
