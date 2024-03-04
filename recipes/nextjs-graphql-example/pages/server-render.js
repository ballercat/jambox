import { useState } from 'react';

const query = `query Pokemon($name: String) {
 pokemon(name: $name) {
   name
   image
 }
}`;

export default function ServerRenderPage({data: initialData}) {
  const [name, setName] = useState('Pikachu');
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetch('https://graphql-pokemon2.vercel.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          name,
        },
      }),
    })
      .then((res) => res.json())
      .then(({ data }) => {
        setLoading(false);
        setData(data);
      });
  };

  const handleInput = (e) => {
    e.preventDefault();
    setName(e.target.value);
  };

  return (
    <>
      <div>
        <input value={name} onChange={handleInput}></input>
        <button onClick={handleSearch}>Search</button>
      </div>
      <div>
        {data ? (
          <img src={data.pokemon.image} alt={data.pokemon.name} />
        ) : loading ? (
          <p>Loading…</p>
        ) : (
          <p>Search for an image</p>
        )}
      </div>
    </>
  );
}


export async function getServerSideProps() {
  const res = await fetch('https://graphql-pokemon2.vercel.app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        name: 'Pikachu',
      },
    }),
  });
  
  const { data } = await res.json();
  console.log(data)
  return {
    props: {
      data,
    },
  };
}
