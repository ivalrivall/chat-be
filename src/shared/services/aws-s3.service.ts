import type {
  ObjectCannedACL,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { S3 } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import mime from 'mime-types';

import type { IFile } from './../../interfaces/IFile.ts';
import { ApiConfigService } from './api-config.service.ts';
import { GeneratorService } from './generator.service.ts';

@Injectable()
export class AwsS3Service {
  private readonly s3: S3;

  constructor(
    public configService: ApiConfigService,
    public generatorService: GeneratorService,
  ) {
    const config = configService.awsS3Config;
    const credentials =
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          }
        : undefined;

    this.s3 = new S3({
      apiVersion: config.bucketApiVersion,
      region: config.bucketRegion,
      endpoint: config.bucketEndpoint,
      forcePathStyle: config.isForcePathStyle,
      credentials,
    });
  }

  async uploadFile(file: IFile, folder = 'files'): Promise<string> {
    const mimeExtension = mime.extension(file.mimetype);
    const extension = typeof mimeExtension === 'string' ? mimeExtension : 'bin';
    const fileName = this.generatorService.fileName(extension);
    const key = `${folder}/${fileName}`;

    const acl = this.configService.awsS3Config.acl;
    const putObjectInput: PutObjectCommandInput = {
      Bucket: this.configService.awsS3Config.bucketName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Key: key,
      ...(acl ? { ACL: acl as ObjectCannedACL } : {}),
    };

    await this.s3.putObject(putObjectInput);

    return key;
  }

  async uploadImage(file: IFile): Promise<string> {
    return this.uploadFile(file, 'images');
  }
}
