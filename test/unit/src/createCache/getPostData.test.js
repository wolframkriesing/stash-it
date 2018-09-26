import { getPostData } from '../../../../src/createCache';
import getDataTests from './getDataTests';

getDataTests(getPostData, 'getPostData', 'post');
