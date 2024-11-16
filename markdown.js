import fs from 'fs';
import path from 'path';
import MarkdownDisplay from '../components/MarkdownDisplay';

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'GetAPI.md');
  const content = fs.readFileSync(filePath, 'utf8');

  return {
    props: {
      content,
    },
  };
}

const MarkdownPage = ({ content }) => {
  return <MarkdownDisplay content={content} />;
};

export default MarkdownPage;