process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
(async () => {
  const res = await fetch('https://hauselink.com/api/public/properties');
  const json = await res.json();
  console.log('Total listings:', json.data?.total);
  (json.data?.data ?? []).forEach((p) =>
    console.log('-', p.title, '| image:', p.imageUrl ? 'YES' : 'NO')
  );
})();
