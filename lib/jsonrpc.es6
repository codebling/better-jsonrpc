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
  constructor(duplexStream) {
    super();
    this.stream = duplexStream;
    this.addLF = true;
    this.lineEmitter = new LineEmitter(duplexStream);
    this.txController = new TransactionController();
    this.lineEmitter.on('line', (line) => {
      this.emit('read', line);
      let message = JsonRpcLite.parse(line).payload;
      this.emit('message', message);
      if(message instanceof JsonRpcLite.RequestObject || message instanceof JsonRpcLite.NotificationObject) {
        let response = new Response(message.id, this);
        if(message instanceof JsonRpcLite.RequestObject) {
          this.txController.add(message.id, message);
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
      if(message instanceof JsonRpcLite.SuccessObject) {
        let request = this.txController.closeSuccessly(message.id, message.result);
        this.emit('response.result', message, request, 'remote', responseObject.result);
        this.emit('remote.response.result', message, request, 'remote', responseObject.result);
      }
      if(message instanceof JsonRpcLite.ErrorObject) {
        let request = this.txController.closeErroneously(message.id, message.error);
        this.emit('response.error', message, request, 'remote', responseObject.error);
        this.emit('remote.response.error', message, request, 'remote', responseObject.error);
      }
      this.emit('response', message, request, 'remote');
      this.emit('remote.response', message, request, 'remote');
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

    this.sendRequestOrNotificationObject(notification, promise, resolve);
  }

  request(method, params) {
    const id = this.txController.prepare();
    const request = JsonRpcLite.request(id, method, params);

    const promise = this.txController.open(id, request);

    this.emit('request', request, promise, 'local', request.params);
    this.emit('request.' + request.method, request, promise, 'local', request.params);
    this.emit('local.request', request, promise, 'local', request.params);
    this.emit('local.request.' + request.method, request, promise, 'local', request.params);

    this.sendRequestOrNotificationObject(request, promise);

    return promise;
  }
  sendRequestOrNotificationObject(requestOrNotificationObject, promise, resolverIfShouldBeResolved) {
    this.emit('requestOrNotification', requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);
    this.emit('requestOrNotification.' + requestOrNotificationObject.method, requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);
    this.emit('local.requestOrNotification', requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);
    this.emit('local.requestOrNotification.' + requestOrNotificationObject.method, requestOrNotificationObject, promise, 'local', requestOrNotificationObject.params);

    let responseString = JSON.stringify(requestOrNotificationObject);
    this.sendString(responseString);

    if(resolverIfShouldBeResolved) {
      resolverIfShouldBeResolved(new JsonRpcLite.success(null, 'OK'));
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
    const request = this.txController.closeErroneously(id, error);
    this.sendResponseObject(JsonRpcLite.error(id, error, request));
  }

  sendResponseObject(responseObject, request) {
    if(responseObject.result) {
      this.emit('response.result', responseObject, request, 'local', responseObject.result);
      this.emit('local.response.result', responseObject, request, 'local', responseObject.result);
    } else {
      this.emit('response.error', responseObject, request, 'local', responseObject.error);
      this.emit('local.response.error', responseObject, request, 'local', responseObject.error);
    }
    this.emit('response', responseObject, request, 'local');
    this.emit('local.response', responseObject, request, 'local');
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