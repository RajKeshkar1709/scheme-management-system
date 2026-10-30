import { SchemeService } from '../schemes/scheme.service';

export class SchemeVersionService {
  static createNewVersion = SchemeService.createNewVersion;
  static updateVersion = SchemeService.updateVersion;
  static submitForReview = SchemeService.submitForReview;
  static approveAndPublish = SchemeService.approveAndPublish;
  static sendBack = SchemeService.sendBack;
}
