import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-md mx-auto text-center">
            <p className="text-6xl font-bold text-primary-600">404</p>
            <h1 className="mt-4 text-2xl font-semibold text-neutral-900">
                요청하신 페이지를 찾을 수 없습니다
            </h1>
            <p className="mt-2 text-neutral-600">경로를 다시 확인해주세요.</p>
            <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-white font-medium hover:bg-primary-700 transition-colors"
            >
                홈으로
            </Link>
        </main>
    );
}
