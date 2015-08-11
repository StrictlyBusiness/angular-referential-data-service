/*eslint-disable no-underscore-dangle */
import angular from 'angular';
import _ from 'lodash';

export default class BaseModel {

  constructor(typeName, data, referentialDataService) {

    this._typeName = typeName;
    this._referentialDataService = referentialDataService;
    this._keyName = typeName.charAt(0).toLowerCase() + typeName.slice(1) + 'Id';
    this._readOnlyProperties = ['hasRead', 'hasWrite', 'hasDelete', 'hasAdmin'];

    if (data) {
      angular.extend(this, data);
    }

    referentialDataService.configureClass(typeName, this);
  }

  get keyName() {
    return this._keyName;
  }

  set keyName(value) {
    this._keyName = value;
  }

  get key() {
    return this[this._keyName];
  }

  set key(value) {
    this[this._keyName] = value;
  }

  get typeName() {
    return this._typeName;
  }

  get readOnlyProperties() {
    return this._readOnlyProperties;
  }

  clone() {
    // Clone the regular properties; shallow clone so we don't get copies of things like the referential data which
    // can cause a real performance hit
    var result = _.clone(this, false);

    // some of our properties, such as roles are arrays and we need those as well but shallow clone doesn't copy them.
    result = this.cloneArrayProperties(result);

    // Maintain the base class
    result.__proto__ = this.__proto__;  //eslint-disable-line no-proto
    // Configure the class with the referential getter and setters
    this._referentialDataService.configureClass(this._typeName, result);
    return result;
  }

  cloneArrayProperties(obj) {

    for (var property in this) {
      // hasOwnProperty check to make sure actually just part of the source object and not of the "base object"
      if (this.hasOwnProperty(property) && Array.isArray(this[property])) {
        obj[property] = _.clone(this[property], false);
      }
    }
    return obj;
  }

  toJSON() {
    var properties = _.omit(this, (value, key, object) => {
      // Ignore "_" prefixed properties or read-only ES6 getters
      return key.indexOf('_') === 0 || !Object.getOwnPropertyDescriptor(object, key);
    });
    return properties;
  }

  hasFieldChanged(value, key, editedCopy) {
    let changed = false;

    if (key.indexOf('_') !== 0 && Object.getOwnPropertyDescriptor(editedCopy, key) && this.readOnlyProperties.indexOf(key) === -1) {

      if (Array.isArray(this[key])) {
        let differences = _.union(_.difference(this[key], editedCopy[key]), _.difference(editedCopy[key], this[key]));
        changed = differences.length !== 0;

      } else {
        changed = editedCopy[key] !== this[key];
      }

    }
    return changed;

  }

  getChanges(editedCopy) {
    // Get the properties that have changed and that are "not special"
    var changes = _.pick(editedCopy, (value, key, edited) => {
      return this.hasFieldChanged(value, key, edited);
    });

    // add the related entityTypeId if possible
    if (this.entityTypeId !== undefined) {
      changes.entityTypeId = this.entityTypeId;
      changes.entityId = this.entityId;
    }


    // Add the primary key from the original object
    if (Object.keys(changes).length) {
      changes[this._keyName] = this.key;
      changes.key = this.key;
      return changes;
    }

    return null;
  }

}
