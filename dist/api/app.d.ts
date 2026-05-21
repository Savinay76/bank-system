import { Application } from 'express';
import { Pool } from 'pg';
export declare function createApp(pool: Pool): Application;
