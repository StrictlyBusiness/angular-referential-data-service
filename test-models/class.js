import moment from 'moment';
import BaseModel from './base-model';

export default class Class extends BaseModel {

  constructor(data, referentialDataService) {
    super('Class', data, referentialDataService);

    // Overrides
    this.startDate = this.startDate ? moment(this.startDate).utc().format('YYYY-MM-DD') : null;
  }

}
