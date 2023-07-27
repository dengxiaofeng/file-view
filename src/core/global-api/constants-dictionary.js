function ConstantsDictionary() {
  this._valuesByName = {};
  this._names = [];
}

ConstantsDictionary.prototype.define = function (name, value) {

  this._valuesByName[name] = value;
  this._names.push(name);
};

ConstantsDictionary.prototype.lookup = function (name) {
  return this._valuesByName[name];
};


ConstantsDictionary.prototype.isDefined = function (name) {
  return name in this._valuesByName;
};


ConstantsDictionary.prototype.list = function () {
  return this._names.map(function (name) {
    return {
      name: name,
      value: this._valuesByName[name]
    };
  }, this);
};

export default ConstantsDictionary
