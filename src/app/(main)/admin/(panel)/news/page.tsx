import { redirect } from 'next/navigation';

// guides and news posts are managed together in Posts & guides
export default function Page() {
  redirect('/admin/site-posts');
}
