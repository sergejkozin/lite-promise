(function() {

  var STATUS = {
    pending: 'pending',
    resolved: 'resolved',
    rejected: 'rejected'
  }

  var PromiseStatus = '[[PromiseStatus]]';
  var PromiseValue = '[[PromiseValue]]';

  var LitePromise = function(executable, parentPromise) {
    var self = this;

    var childs = [];

    parentPromise = (parentPromise instanceof LitePromise) ? parentPromise : null;

    this[PromiseStatus] = STATUS.pending;
    this[PromiseValue] = undefined;

    function fullfill(status, value) {
      if (self[PromiseStatus] !== STATUS.pending)
        return;

      self[PromiseStatus] = status;
      self[PromiseValue] = value;

      if (status === STATUS.rejected && !childs.length)
        throw(value);

      childs.forEach(function(childPromise) {
        childPromise.__run();
      })
    }

    var resolve = function(value) {fullfill(STATUS.resolved, value)};
    var reject = function(error) {fullfill(STATUS.rejected, error)};

    this.__run = function() {
      setTimeout(function() {
        try {
          executable(resolve, reject);
        }
        catch(error) {
          reject(error);
        }
      })
    }

    this.then = function(onResolve, onReject) {
      var nextPromise = new LitePromise(function(resolve, reject) {
        var handler = (self[PromiseStatus] === STATUS.resolved) ? (onResolve) : (onReject);

        if (!handler) {
          if (self[PromiseStatus] === STATUS.resolved)
            return resolve(self[PromiseValue]);
          return reject(self[PromiseValue]);
        }

        try {
          var res = handler(self[PromiseValue]);
        }
        catch(error) {
          return reject(error);
        }

        if (res instanceof LitePromise) {
          res.then(function(data) {
            resolve(data);
          })
        }
        else {
          resolve(res);
        }

      }, self);

      childs.push(nextPromise);
      return nextPromise;
    }

    this.catch = function(onReject) {
      return this.then(null, onReject);
    }

    this.finally = function(onFinally) {
      return this.then(onFinally, onFinally);
    }

    this.toString = function() {
      return '[object Promise]';
    }

    if (!parentPromise || parentPromise[PromiseStatus] !== STATUS.pending)
    this.__run();
  }

  LitePromise.resolve = function(value) {
    return new LitePromise(function(resolve) {
      setTimeout(function() {
        resolve(value);
      })
    })
  }

  LitePromise.reject = function(value) {
    return new LitePromise(function(resolve, reject) {
      setTimeout(function() {
        reject(value);
      })
    })
  }

  LitePromise.all = function(promises) {
    return new LitePromise(function(resolve, reject) {
      var count = promises.length;
      var results = [];

      promises.forEach(function(promise, i) {
        promise.then(
          function(val) {
            results[i] = val;
            if (--count === 0) {
              resolve(results);
            }
          },

          function(err) {
            reject(err);
          }
        )
      });
    })
  }

  LitePromise.race = function(promises) {
    return new LitePromise(function(resolve, reject) {
      var pending = true;

      promises.forEach(function(promise, i) {
        promise.then(
          function(val) {
            if (pending) {
              pending = false;
              resolve(val);
            }
          },

          function(err) {
            if (pending) {
              pending = false;
              reject(err);
            }
          }
        )
      });
    })
  }

  window.Promise = LitePromise;

})();
