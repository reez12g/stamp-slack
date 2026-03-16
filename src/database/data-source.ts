import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './typeorm.config';

export default new DataSource(getDataSourceOptions());
