const EventEmitter = require('events');

const TransactionController = require('./transaction-controller.es6');
const LineEmitter = require('./line-emitter.es6');

const JsonRpcLite = require('jsonrpc-lite');
const Promise = require('bluebird');

/*
Server-originated

stream.on('data')
  -> linereader.on('line')
      -> jsonrpc-lite-parse  emit('request', 'type', req, res) || handler['type'](req, res)
                                   res.send || res.error <-
                jsonrpc-lite-success || error <-
           JSON.stringify() <-
       add crlf <-
stream.write <-



Local-originated

thislib.notify/request/send
                    -> jsonrpc-lite-request/notification
                                      -> object.serialize || json.stringify(object)
                                                      -> add crlf
                                                            -> stream.write
                                                               stream.on('data') <-
                                                      linereader.on('line') <-
jsonrpc-lite-parse emit('response', req, res) && res promise resolve  <-

 */

class JsonRpc extends EventEmitter {
  constructor(options) {
    super();
    this.stream = options.stream;
    this.addLF = 'addLF' in options ? options.addLF : true;
    this.rejectLocalErrorResponsePromises = options.rejectLocalErrorResponsePromises || false;
    this.lineEmitter = options.lineEmitter || new LineEmitter(stream);
    this.txController = options.txController || new TransactionController();
    this.objectEmitter = options.objectEmitter || this;

    this.lineEmitter.on('line', (line) => {
      this.emit('read', line);
      let message = JsonRpcLite.parse(line).payload;
      this.emit('message', message);
    });
    this.objectEmitter.on('message', (message) => {
      if(message instanceof JsonRpcLite.RequestObject || message instanceof JsonRpcLite.NotificationObject) {
        let response = new Response(message.id, this);
        if(message instanceof JsonRpcLite.RequestObject) {
          this.txController.open(message.id, message);
          this.emit('request', message, response, 'remote', message.params);
          this.emit('request.' + message.method, message, response, 'remote', message.params);
          this.emit('remote.request', message, response, 'remote', message.params);
          this.emit('remote.request.' + message.method, message, response, 'remote', message.params);
        }
        if(message instanceof JsonRpcLite.NotificationObject) {
          this.emit('notification', message, response, 'remote', message.params);
          this.emit('notification.' + message.method, message, response, 'remote', message.params);
          this.emit('remote.notification', message, response, 'remote', message.params);
          this.emit('remote.notification.' + message.method, message, response, 'remote', message.params);
        }
        this.emit('requestOrNotification', message, response, 'remote', message.params);
        this.emit('requestOrNotification.' + message.method, message, response, 'remote', message.params);
        this.emit('remote.requestOrNotification', message, response, 'remote', message.params);
        this.emit('remote.requestOrNotification.' + message.method, message, response, 'remote', message.params);
      }
      if(message instanceof JsonRpcLite.SuccessObject || message instanceof JsonRpcLite.ErrorObject) {
      let request;
      if(message instanceof JsonRpcLite.SuccessObject) {
        request = this.txController.closeSuccessly(message.id, message.result);
        this.emit('response.result', message, request, 'remote', message.result);
        this.emit('response.' + request.method + '.result', message, request, 'remote', message.result);
        this.emit('remote.response.result', message, request, 'remote', message.result);
        this.emit('remote.response.' + request.method + '.result', message, request, 'remote', message.result);
      }
      if(message instanceof JsonRpcLite.ErrorObject) {
        request = this.txController.closeErroneously(message.id, message.error);
        this.emit('response.error', message, request, 'remote', message.error);
        this.emit('response.' + request.method + '.error', message, request, 'remote', message.error);
        this.emit('remote.response.error', message, request, 'remote', message.error);
        this.emit('remote.response.' + request.method + '.error', message, request, 'remote', message.error);
      }
      this.emit('response', message, request, 'remote');
      this.emit('response.' + request.method, message, request, 'remote');
      this.emit('remote.response', message, request, 'remote');
      this.emit('remote.response.' + request.method, message, request, 'remote');
      }
    })
  }

  notify(method, params) {
    const notification = JsonRpcLite.notification(method, params);

    let resolve;
    const promise = new Promise(res => resolve=res);

    this.emit('notification', notification, promise, 'local', notification.params);
    this.emit('notification.' + notification.method, notification, promise, 'local', notification.params);
    this.emit('local.notification', notification, promise, 'local', notification.params);
    this.emit('local.notification.' + notification.method, notification, promise, 'local', notification.params);

    try {
      this.sendRequestOrNotificationObject(notification, promise, resolve);
    } catch(error) {
      promise.reject(error);
    }

    return promise;
  }

  request(method, params) {
    const id = this.txController.prepare();
    const request = JsonRpcLite.request(id, method, params);

    const promise = this.txController.open(id, request);

    this.emit('request', request, promise, 'local', request.params);
    this.emit('request.' + request.method, request, promise, 'local', request.params);
    this.emit('local.request', request, promise, 'local', request.params);
    this.emit('local.request.' + request.method, request, promise, 'local', request.params);

    try {
      this.sendRequestOrNotificationObject(request, promise);
    } catch(error) {
      this.txController.closeErroneously(id, error);
    }

    return promise;
  }
  sendRequestOrNotificationObject(requestOrNotificationObject, promise, resolverIfShouldBeResolved) {
    let responseString = JSON.stringify(requestOrNotificationObject);
    this.sendString(responseString);

    this.emit('requestOrNotification', requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);
    this.emit('requestOrNotification.' + requestOrNotificationObject.method, requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);
    this.emit('local.requestOrNotification', requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);
    this.emit('local.requestOrNotification.' + requestOrNotificationObject.method, requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);

    if(resolverIfShouldBeResolved) {
      resolverIfShouldBeResolved();
    }
  }

  //implement me
  //sendRequest(something) {
  //  let message;
  //  if(typeof something == 'object') {
  //    message = something;
  //  } else if(typeof something == 'string') {
  //    try {
  //      message = JsonRpcLite.parse(something);
  //    } catch
  //  } else {
  //    throw new Error();
  //  }
  //}

  respondSuccess(id, result) {
    const request = this.txController.closeSuccessly(id, result);
    this.sendResponseObject(JsonRpcLite.success(id, result), request);
  }

  respondError(id, message, code) {
    const error = new JsonRpcLite.JsonRpcError(message, code);

    //don't reject promises for locally-originating error responses
    // unless explicitly configured to do so (otherwise we cause
    // unhandled promise rejections
    let reject = this.rejectLocalErrorResponsePromises ? 'reject' : null;
    const request = this.txController.close(id, reject, error);

    this.sendResponseObject(JsonRpcLite.error(id, error), request);
  }

  sendResponseObject(responseObject, request) {
    if(responseObject.result) {
      this.emit('response.result', responseObject, request, 'local', responseObject.result);
      this.emit('response.' + request.method + '.result', responseObject, request, 'local', responseObject.result);
      this.emit('local.response.result', responseObject, request, 'local', responseObject.result);
      this.emit('local.response.' + request.method + '.result', responseObject, request, 'local', responseObject.result);
    } else {
      this.emit('response.error', responseObject, request, 'local', responseObject.error);
      this.emit('response.' + request.method + '.error', responseObject, request, 'local', responseObject.error);
      this.emit('local.response.error', responseObject, request, 'local', responseObject.error);
      this.emit('local.response.' + request.method + '.error', responseObject, request, 'local', responseObject.error);
    }
    this.emit('response', responseObject, request, 'local');
    this.emit('response.' + request.method, responseObject, request, 'local');
    this.emit('local.response', responseObject, request, 'local');
    this.emit('local.response.' + request.method, responseObject, request, 'local');
    let responseString = JSON.stringify(responseObject);
    this.sendString(responseString);
  }
  sendString(responseString) {
    if(this.addLF) {
      responseString += '\n';
    }
    this.sendFinalString(responseString);
  }
  sendFinalString(finalResponseString) {
    this.emit('write', finalResponseString);
    this.stream.write(finalResponseString);
  }
}

class Response {
  constructor(id, jsonRpc) {
    this.id = id;
    this.jsonRpc = jsonRpc;
  }
  send(result) {
    this.success(result);
  }
  success(result) { //alias to send
    if(this.id) {
      this.jsonRpc.respondSuccess(this.id, result);
    }
  }
  error(message, code) {
    if(this.id) {
      this.jsonRpc.respondError(this.id, message, code);
    }
  }
}

module.exports = JsonRpc;