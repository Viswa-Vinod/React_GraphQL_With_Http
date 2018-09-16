import React, { Component } from 'react';
import axios from 'axios';


const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`
  }
})
const TITLE = 'React GraphQL GitHub Client';


const GET_ISSUES_OF_REPOSITORY =  
`query ($organization: String!, $repository: String!, $cursor: String)
{
    organization(login: $organization) {
      name
      url
      description
      email
      repository(name: $repository) {
        name
        url
        description
        id
        stargazers {
          totalCount
        }
        viewerHasStarred
        issues (first:5, after: $cursor, states:[OPEN]) {
          totalCount
          edges {
            node {
              id
              title
              url
              reactions(last:3){
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

const ADD_STAR = `
  mutation ($repoId: ID!) {
    addStar(input: {starrableId:$repoId}) {
      starrable{viewerHasStarred}
    }
  }
`;

const REMOVE_STAR = `
mutation ($repoId: ID!){
  removeStar(input: {starrableId: $repoId}) {
    starrable{viewerHasStarred}
  }
}`

const ADD_REACTION = `
mutation ($nodeId: ID!, $content: ReactionContent!) {
  addReaction(input: {subjectId:$nodeId , content:$content}) {
    reaction {        
          id
          content                     
    }
  }
}
`
const addStarToRepo = repoId => {
  
  return axiosGitHubGraphQL.post('',{
    query: ADD_STAR,
    variables: {repoId}
  })
}

const removeStarToRepo = repoId => {
  return axiosGitHubGraphQL.post('', {
    query: REMOVE_STAR,
    variables: {repoId}
  })
}

const addReactionToNode = (node, reactionContent) => {
  
  return axiosGitHubGraphQL.post('', {
    query: ADD_REACTION,
    variables: {nodeId: node.id, content:reactionContent }
  })
}
const getIssuesOfRepository = (path, cursor) => {
  const [organization, repository] = path.split('/');
   return axiosGitHubGraphQL
      .post('', { query: GET_ISSUES_OF_REPOSITORY, variables: {organization, repository, cursor} })
}

const resolveIssuesQuery = (queryResult, cursor) => state => {
  const {data, errors} = queryResult.data;

  if(!cursor) {
    return {
      organization: data.organization,
      errors
    }
  }

  const {edges: oldIssues} = state.organization.repository.issues;
  const {edges: newIssues} = data.organization.repository.issues;
  const updatedIssues = [...oldIssues, ...newIssues];

  return {
    organization: {
      ...data.organization,
      repository: {
        ...data.organization.repository,
        issues: {
          ...data.organization.repository.issues,
          edges: updatedIssues
        }
      },
      errors
    },
    
  }
};


const resolveAddStarMutation = mutationResult => state => {
  const {
    viewerHasStarred
  } = mutationResult.data.data.addStar.starrable;
  const { totalCount } = state.organization.repository.stargazers;
  return {
    ...state,
    organization: {
      ...state.organization,
      repository: {
        ...state.organization.repository,
        viewerHasStarred,
        stargazers: {
          totalCount: totalCount + 1
        }
      }
    }
  }
}

const resolveAddReactionMutation = (mutationResult, node) => state => {
  
  const {reaction} = mutationResult.data.data.addReaction;

  if (node.reactions && node.reactions.edges.length > 0) node.reactions.edges = [...node.reactions.edges, {node: reaction}];
  else node.reactions = {edges: [{node: reaction}]}
  
  return {
    ...state,
    organization: {
      ...state.organization,
      repository: {
        ...state.organization.repository,
        issues: {
          ...state.organization.repository.issues,
          edges: [
            ...state.organization.repository.issues.edges,
            
          ]          
        }
      }
    }
  }
}

const resolveRemoveStarMutation = mutationResult => state => {
  const {
    viewerHasStarred
  } = mutationResult.data.data.removeStar.starrable;
  const { totalCount } = state.organization.repository.stargazers;
  return {
    ...state,
    organization: {
      ...state.organization,
      repository: {
        ...state.organization.repository,
        viewerHasStarred,
        stargazers: {
          totalCount: totalCount - 1
        }
      }
    }
  }
}

class App extends Component {
   state = {
    path: 'the-road-to-learn-react/the-road-to-learn-react',
  };

  componentDidMount() {
    // fetch data
    this.onFetchFromGitHub(this.state.path);
  }

 onFetchFromGitHub = (path, cursor) => {
   getIssuesOfRepository(path, cursor)
      .then(queryResult => this.setState(resolveIssuesQuery(queryResult, cursor)));
  };

  onStarRepository = (repoId, viewerHasStarred)=>{

    !viewerHasStarred && addStarToRepo(repoId).then(mutationResult => {
      
      this.setState(resolveAddStarMutation(mutationResult))
    })

    viewerHasStarred && removeStarToRepo(repoId).then(mutationResult=>{
      this.setState(resolveRemoveStarMutation(mutationResult))
    })
  }

  onAddReaction = (node, reactionContent) => {
    addReactionToNode(node, reactionContent).then(mutationResult => {
      this.setState(resolveAddReactionMutation(mutationResult, node))
    })
  }
  onFetchMoreIssues = () => {
    const {endCursor} = this.state.organization.repository.issues.pageInfo;
    this.onFetchFromGitHub(this.state.path, endCursor);
  }

  onChange = event => {
    this.setState({ path: event.target.value });
  };

  onSubmit = event => {
    // fetch data
    this.onFetchFromGitHub(this.state.path);
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
        ? <Organization organization={organization} errors={errors} onFetchMoreIssues={this.onFetchMoreIssues} onStarRepository={this.onStarRepository} onAddReaction={this.onAddReaction}/>
        : <p>No information yet...</p>
      } 
      </div>
    );
  }
}

const Organization = ({ organization, errors, onFetchMoreIssues, onStarRepository, onAddReaction }) => {

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
    <p>{organization.description}</p>
    <strong>Email:</strong><span>{organization.email}</span>
    <Repository repository={organization.repository} onFetchMoreIssues={onFetchMoreIssues} onStarRepository={onStarRepository} onAddReaction={onAddReaction}/>
  </div>
  )
}

const Repository = ({ repository, onFetchMoreIssues, onStarRepository, onAddReaction }) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <p><strong>description:</strong><span>{repository.description}</span></p>
    <p><strong>Total Count: </strong>{repository.issues.totalCount}</p>
    <button type="button" onClick={()=>onStarRepository(repository.id, repository.viewerHasStarred)}>
      {repository.stargazers.totalCount}{" "}
      {repository.viewerHasStarred?'Unstar': 'Star'}
      </button>
    <ul>
      {
        repository.issues.edges.map(issue => (
          <li key={issue.node.id}>
            <a href={issue.node.url}>{issue.node.title}</a>
            <button type="button" onClick={()=>onAddReaction(issue.node, 'HOORAY')}>HOORAY</button>
            <ul>
              {issue.node.reactions.edges.map(reaction => 
               
                 (
                <li key={reaction.node.id}>{reaction.node.content}</li>
              ))}
            </ul>
          </li>
        ))
      }
    </ul>
    <hr />
    {
      repository.issues.pageInfo.hasNextPage && (

      <button onClick={onFetchMoreIssues}>More</button>
      )
    }
  </div>
);
export default App;