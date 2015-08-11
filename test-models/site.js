import BaseModel from './base-model';

export default class Site extends BaseModel {

  constructor(data, referentialDataService) {
    super('Site', data, referentialDataService);
  }

}
