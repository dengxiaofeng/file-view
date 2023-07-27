var Storage = function (customStorage, namespace) {
  this._namespace = namespace || '';
  this._storage = this._getStorage(customStorage);
};

Storage.prototype.getItem = function (key) {
  var storageValue;
  key = this._namespace + key.toString();
  storageValue = new StorageValue();
  storageValue.fromJSON(this._storage.getItem(key));
  if (storageValue.isExpired()) {
    this._storage.removeItem(key);
    return;
  }
  return storageValue.value;
};

Storage.prototype.setItem = function (key, value, expiry) {
  key = this._namespace + key.toString();
  this._storage.setItem(
    key,
    new StorageValue(value, expiry).toJSON()
  );
};

Storage.prototype.removeItem = function (key) {
  key = this._namespace + key.toString();
  this._storage.removeItem(key);
};

Storage.prototype._hasLocalStorage = function () {
  var test = this._namespace + 'hasLocalStorage';

  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

Storage.prototype._getStorage = function (customStorage) {
  if (customStorage) {
    return customStorage;
  } else if (this._hasLocalStorage()) {
    return Storage.localStorage;
  }
  return Storage.noStorage;
};


Storage.noStorage = {
  setItem: function () {
  },
  getItem: function () {
  },
  removeItem: function () {
  }
};

Storage.localStorage = {
  setItem: function (key, value) {
    window.localStorage.setItem(key, value);
  },

  getItem: function (key) {
    return window.localStorage.getItem(key);
  },

  removeItem: function (key) {
    window.localStorage.removeItem(key);
  }
};


var StorageValue = Storage.StorageValue = function (value, expiry) {
  this.value = value;
  this._setExpiry(expiry);
};

StorageValue.prototype._setExpiry = function (expiry) {
  if (parseInt(expiry)) {
    this.expiry = Date.now() + expiry;
  } else {
    this.expiry = null;
  }
};


StorageValue.prototype.isExpired = function () {
  return this.expiry && Date.now() > this.expiry;
};


StorageValue.prototype.fromJSON = function (stringifiedJson) {
  var json;
  stringifiedJson = stringifiedJson || '{}';
  json = JSON.parse(stringifiedJson);
  this.value = json.value;
  this.expiry = json.expiry;
};

StorageValue.prototype.toJSON = function () {
  return JSON.stringify({
    value: this.value,
    expiry: this.expiry || undefined
  });
};

export default Storage
