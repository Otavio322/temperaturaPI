class ErroHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const assincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ErroHttp, assincrono };
