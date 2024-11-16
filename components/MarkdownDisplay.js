import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownDisplay = ({ content }) => {
  return <ReactMarkdown>{content}</ReactMarkdown>;
};

export default MarkdownDisplay;