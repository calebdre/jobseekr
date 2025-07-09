import { decodeHtmlEntities } from "@/lib/utils/decodeHtmlEntities";
import DOMPurify from "dompurify";
import parse from 'html-react-parser';

export const SafeJobPosting = ({ content }: { content: string }) => {
    const decoded = decodeHtmlEntities(content);
    const sanitized = DOMPurify.sanitize(decoded);
    return (
        <div className="p-4">
            <div className="text-sm prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-pre:bg-gray-50 prose-pre:border prose-code:text-blue-600">
                {parse(sanitized)}
            </div>
        </div>
    )
};