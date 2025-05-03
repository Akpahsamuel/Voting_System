import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash } from "lucide-react";
import { cn } from "../../lib/utils";

// Import shadcn components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";

// Form schema validation
const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(100, { message: "Title cannot exceed 100 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  expiration: z.date({
    required_error: "Expiration date is required",
  }).refine((date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return date >= tomorrow;
  }, {
    message: "Expiration date must be at least tomorrow",
  }),
  candidates: z.array(z.object({
    name: z.string().min(1, { message: "Candidate name is required" }),
    description: z.string().min(1, { message: "Candidate description is required" }),
    imageUrl: z.string().optional(),
  })).min(2, { message: "At least 2 candidates are required" }),
});

type CandidateInput = {
  name: string;
  description: string;
  imageUrl?: string;
};

interface CreateBallotProps {
  adminCapId: string | undefined;
  superAdminCapId: string | undefined;
  hasSuperAdminCap: boolean;
}

const CreateBallot = ({ adminCapId, superAdminCapId, hasSuperAdminCap }: CreateBallotProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const packageId = useNetworkVariable("packageId" as any);
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      candidates: [
        { name: "", description: "", imageUrl: "" },
        { name: "", description: "", imageUrl: "" }
      ]
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!adminCapId && !superAdminCapId) {
      toast.error("Admin capability not found");
      return;
    }

    setIsLoading(true);

    try {
      const tx = new Transaction();
      
      // Create the ballot
      if (hasSuperAdminCap && superAdminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::create_ballot_super`,
          arguments: [
            tx.object(dashboardId),
            tx.object(superAdminCapId),
            tx.pure(values.title),
            tx.pure(values.description),
            tx.pure(Math.floor(values.expiration.getTime() / 1000)), // Convert to Unix timestamp
            tx.pure(isPrivate),
          ],
        });
      } else if (adminCapId) {
        tx.moveCall({
          target: `${packageId}::ballot::create_ballot`,
          arguments: [
            tx.object(dashboardId),
            tx.object(adminCapId),
            tx.pure(values.title),
            tx.pure(values.description),
            tx.pure(Math.floor(values.expiration.getTime() / 1000)), // Convert to Unix timestamp
            tx.pure(isPrivate),
          ],
        });
      }

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (result: SuiTransactionBlockResponse) => {
            // Extract the ballot ID from the transaction result
            const ballotId = result.effects?.created?.[0]?.reference?.objectId;
            
            if (ballotId) {
              // Now add candidates to the ballot
              addCandidatesToBallot(ballotId, values.candidates);
            } else {
              toast.error("Failed to create ballot: Ballot ID not found in transaction result");
              setIsLoading(false);
            }
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            toast.error("Failed to create ballot");
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error creating ballot:", error);
      toast.error("An error occurred while creating the ballot");
      setIsLoading(false);
    }
  };

  const addCandidatesToBallot = async (ballotId: string, candidates: CandidateInput[]) => {
    try {
      // Create a transaction to add all candidates
      const tx = new Transaction();
      
      for (const candidate of candidates) {
        if (candidate.imageUrl && candidate.imageUrl.trim() !== "") {
          // Add candidate with image URL
          if (hasSuperAdminCap && superAdminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate_with_image_super`,
              arguments: [
                tx.object(ballotId),
                tx.object(superAdminCapId),
                tx.pure(candidate.name),
                tx.pure(candidate.description),
                tx.pure(candidate.imageUrl),
              ],
            });
          } else if (adminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate_with_image`,
              arguments: [
                tx.object(ballotId),
                tx.object(adminCapId),
                tx.pure(candidate.name),
                tx.pure(candidate.description),
                tx.pure(candidate.imageUrl),
              ],
            });
          }
        } else {
          // Add candidate without image URL
          if (hasSuperAdminCap && superAdminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate_super`,
              arguments: [
                tx.object(ballotId),
                tx.object(superAdminCapId),
                tx.pure(candidate.name),
                tx.pure(candidate.description),
              ],
            });
          } else if (adminCapId) {
            tx.moveCall({
              target: `${packageId}::ballot::add_candidate`,
              arguments: [
                tx.object(ballotId),
                tx.object(adminCapId),
                tx.pure(candidate.name),
                tx.pure(candidate.description),
              ],
            });
          }
        }
      }

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
            toast.success("Ballot created successfully with candidates");
            form.reset();
            setIsLoading(false);
          },
          onError: (error) => {
            console.error("Failed to add candidates:", error);
            toast.error("Ballot created but failed to add candidates");
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Error adding candidates:", error);
      toast.error("Ballot created but failed to add candidates");
      setIsLoading(false);
    }
  };

  const addCandidate = () => {
    const currentCandidates = form.getValues("candidates");
    form.setValue("candidates", [
      ...currentCandidates,
      { name: "", description: "", imageUrl: "" }
    ]);
  };

  const removeCandidate = (index: number) => {
    const currentCandidates = form.getValues("candidates");
    if (currentCandidates.length <= 2) {
      toast.error("At least 2 candidates are required");
      return;
    }
    
    const updatedCandidates = [...currentCandidates];
    updatedCandidates.splice(index, 1);
    form.setValue("candidates", updatedCandidates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Ballot</CardTitle>
        <CardDescription>
          Create a new ballot for users to vote on candidates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ballot Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter ballot title" {...field} />
                  </FormControl>
                  <FormDescription>
                    A clear, concise title for your ballot
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a detailed description of the ballot"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide context and details about what users are voting on
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiration"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiration Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(0, 0, 0, 0);
                          return date < tomorrow;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when voting will end
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2">
              <Switch
                id="private-ballot"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <label
                htmlFor="private-ballot"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Private Ballot (only registered voters can vote)
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Candidates</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCandidate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </div>

              {form.watch("candidates").map((_, index) => (
                <div key={index} className="p-4 border rounded-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Candidate {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCandidate(index)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`candidates.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Candidate name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`candidates.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Candidate description"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`candidates.${index}.imageUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormDescription>
                          A URL to an image representing this candidate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              {form.formState.errors.candidates && (
                <p className="text-sm font-medium text-red-500">
                  {form.formState.errors.candidates.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Ballot...
                </>
              ) : (
                "Create Ballot"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateBallot;
