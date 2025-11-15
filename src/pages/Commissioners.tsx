import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Search, ArrowUpDown, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

interface Commissioner {
  id: string;
  name: string;
  title: string;
  bias_score: number;
  total_cases: number;
  first_appearance_date: string;
  created_at: string;
}

export default function Commissioners() {
  const [commissioners, setCommissioners] = useState<Commissioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Commissioner>("bias_score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchCommissioners();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCommissioners = async () => {
    try {
      const { data, error } = await supabase
        .from('commissioners')
        .select('*')
        .order('bias_score', { ascending: false });

      if (error) throw error;
      setCommissioners(data || []);
    } catch (error) {
      console.error('Error fetching commissioners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Commissioner) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-destructive';
    if (score >= 50) return 'text-warning';
    if (score >= 20) return 'text-accent';
    return 'text-success';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Severe';
    if (score >= 50) return 'High';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  const getSeverityVariant = (score: number): "default" | "destructive" | "warning" | "success" => {
    if (score >= 80) return 'destructive';
    if (score >= 50) return 'warning';
    if (score >= 20) return 'default';
    return 'success';
  };

  const filteredAndSortedCommissioners = commissioners
    .filter(commissioner =>
      commissioner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commissioner.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === "asc" ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction * aValue.localeCompare(bValue);
      }
      
      return direction * ((aValue as number) - (bValue as number));
    });

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Commissioner Bias Tracking</h1>
          <p className="text-muted-foreground">
            Track bias patterns across all commissioners and cases
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{commissioners.length}</div>
                <div className="text-sm text-muted-foreground">Total Commissioners</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning">
                  {commissioners.filter(c => c.bias_score >= 50).length}
                </div>
                <div className="text-sm text-muted-foreground">High Bias Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">
                  {commissioners.reduce((sum, c) => sum + c.total_cases, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Cases Reviewed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>All Commissioners</CardTitle>
                <CardDescription>
                  {filteredAndSortedCommissioners.length} commissioner{filteredAndSortedCommissioners.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search commissioners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading commissioners...</div>
            ) : filteredAndSortedCommissioners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No commissioners found matching your search' : 'No commissioners tracked yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('name')} className="hover:bg-transparent">
                          Name <ArrowUpDown className="ml-2 w-4 h-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('bias_score')} className="hover:bg-transparent">
                          Bias Score <ArrowUpDown className="ml-2 w-4 h-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('total_cases')} className="hover:bg-transparent">
                          Cases <ArrowUpDown className="ml-2 w-4 h-4" />
                        </Button>
                      </TableHead>
                      <TableHead>First Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCommissioners.map((commissioner) => (
                      <TableRow key={commissioner.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{commissioner.name}</TableCell>
                        <TableCell className="text-muted-foreground">{commissioner.title || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${getScoreColor(commissioner.bias_score)}`}>
                              {commissioner.bias_score}
                            </span>
                            <Badge variant={getSeverityVariant(commissioner.bias_score)}>
                              {getScoreLabel(commissioner.bias_score)}
                            </Badge>
                            <div className="w-24">
                              <Progress value={commissioner.bias_score} className="h-2" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{commissioner.total_cases}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(commissioner.first_appearance_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
