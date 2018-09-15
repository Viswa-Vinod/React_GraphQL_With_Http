import React, { Component } from 'react';
import axios from 'axios';
console.log(process.env)

const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`
  }
})
const TITLE = 'React GraphQL GitHub Client';
const GET_ORGANIZATION = `
  {
    organization(login: "the-road-to-learn-react") {
      name
      url
    }
  }
`;

class App extends Component {
   state = {
    path: 'the-road-to-learn-react/the-road-to-learn-react',
  };

  componentDidMount() {
    // fetch data
    this.onFetchFromGitHub();
  }

 onFetchFromGitHub = () => {
    axiosGitHubGraphQL
      .post('', { query: GET_ORGANIZATION })
      .then(result => this.setState(() => ({
          organization: result.data.data.organization,
          errors: result.data.errors,
        })));
  };

  onChange = event => {
    this.setState({ path: event.target.value });
  };

  onSubmit = event => {
    // fetch data

    event.preventDefault();
  };
  render() {
    const {path, organization, errors} = this.state;
    return (
      <div>
        <h1>{TITLE}</h1>

        <form onSubmit={this.onSubmit}>
          <label htmlFor="url">
            Show open issues for https://github.com/
          </label>
          <input
            id="url"
            type="text"
            onChange={this.onChange}
            style={{ width: '300px' }}
            value={path}
          />
          <button type="submit">Search</button>
        </form>

        <hr />

      {
        organization 
        ? <Organization organization={organization} errors={errors}/>
        : <p>No information yet...</p>
      } 
      </div>
    );
  }
}

const Organization = ({ organization, errors }) => {

  if (errors) {
    return (
       <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    )
  }
  return (

  <div>
    <p>
      <strong>Issues from Organization:</strong>
      <a href={organization.url}>{organization.name}</a>
    </p>
  </div>
  )
}

export default App;