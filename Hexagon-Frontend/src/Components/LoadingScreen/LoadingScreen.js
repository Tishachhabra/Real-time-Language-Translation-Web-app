import React from 'react';
import { Flex, Spin } from 'antd';
import './LoadingScreen.css';
const LoadingScreen = () => (
  <Flex gap="small" vertical>
    <Flex gap="small">
      <Spin tip="Uploading..." size="small">
        <div className="content" />
      </Spin>
    </Flex>
  </Flex>
);
export default LoadingScreen;